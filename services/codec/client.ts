import { ImageSession, type DecodeOptions, type EncodeParams } from './engine';
import type { WorkerRequest, WorkerResponse } from './protocol';

export interface ImageSessionHandle {
  readonly width: number;
  readonly height: number;
  /** True when the source was scaled down by `resize`. */
  readonly resized: boolean;
  encode(params: EncodeParams): Promise<Blob>;
  similarity(candidate: Blob, sampleWidth: number): Promise<number | null>;
  close(): void;
}

const MAX_WORKERS = 3;

const canUseWorkers = () =>
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

// Omit<Union, K> collapses the union to its common keys; this keeps each member.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** One codec worker plus the bookkeeping for the requests in flight on it. */
class CodecWorker {
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  openSessions = 0;

  constructor() {
    this.worker = this.spawn();
  }

  private spawn(): Worker {
    const worker = new Worker(new URL('./codec.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const entry = this.pending.get(response.id);
      if (!entry) return;
      this.pending.delete(response.id);
      if (response.ok === false) {
        const error = new Error(response.error.message);
        error.name = response.error.name;
        entry.reject(error);
        return;
      }
      entry.resolve(response.result);
    };
    worker.onerror = (event) => {
      // The worker is in an unknown state: fail everything and start fresh.
      const error = new Error(event.message || 'Compression worker crashed');
      this.pending.forEach((entry) => entry.reject(error));
      this.pending.clear();
      this.openSessions = 0;
      this.worker.terminate();
      this.worker = this.spawn();
    };
    return worker;
  }

  request(message: DistributiveOmit<WorkerRequest, 'id'>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...message, id });
    });
  }
}

const pool: CodecWorker[] = [];

const poolSize = () => {
  const cpuCount = navigator.hardwareConcurrency || 4;
  return Math.max(1, Math.min(MAX_WORKERS, Math.floor(cpuCount / 2)));
};

const leastBusyWorker = (): CodecWorker => {
  if (pool.length < poolSize()) {
    const worker = new CodecWorker();
    pool.push(worker);
    return worker;
  }
  return pool.reduce((best, w) => (w.openSessions < best.openSessions ? w : best));
};

let nextSessionId = 1;

const openWorkerSession = async (blob: Blob, options: DecodeOptions): Promise<ImageSessionHandle> => {
  const worker = leastBusyWorker();
  const sessionId = `s${nextSessionId++}`;
  worker.openSessions++;
  let closed = false;

  try {
    const { width, height, resized } = (await worker.request({ type: 'open', sessionId, blob, options })) as {
      width: number;
      height: number;
      resized: boolean;
    };

    return {
      width,
      height,
      resized,
      async encode(params) {
        const buffer = (await worker.request({ type: 'encode', sessionId, params })) as ArrayBuffer;
        return new Blob([buffer], { type: params.mime });
      },
      async similarity(candidate, sampleWidth) {
        return (await worker.request({ type: 'similarity', sessionId, candidate, sampleWidth })) as number | null;
      },
      close() {
        if (closed) return;
        closed = true;
        worker.openSessions--;
        void worker.request({ type: 'close', sessionId }).catch(() => {});
      },
    };
  } catch (error) {
    worker.openSessions--;
    throw error;
  }
};

const openMainThreadSession = async (blob: Blob, options: DecodeOptions): Promise<ImageSessionHandle> => {
  const session = await ImageSession.open(blob, options);
  return {
    width: session.width,
    height: session.height,
    resized: session.resized,
    async encode(params) {
      return new Blob([await session.encode(params)], { type: params.mime });
    },
    similarity: (candidate, sampleWidth) => session.similarity(candidate, sampleWidth),
    close() {},
  };
};

/**
 * Decodes an image once and returns a handle for encoding it (repeatedly) and
 * scoring candidates against it. Runs in a worker where the browser allows.
 */
export const openImageSession = (blob: Blob, options: DecodeOptions = {}): Promise<ImageSessionHandle> =>
  canUseWorkers() ? openWorkerSession(blob, options) : openMainThreadSession(blob, options);
