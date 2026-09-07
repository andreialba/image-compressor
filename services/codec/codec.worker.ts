import { ImageSession } from './engine';
import type { WorkerRequest, WorkerResponse } from './protocol';

const sessions = new Map<string, ImageSession>();

const requireSession = (id: string): ImageSession => {
  const session = sessions.get(id);
  if (!session) throw new Error(`Unknown image session ${id}`);
  return session;
};

const reply = (message: WorkerResponse, transfer: Transferable[] = []) => {
  (self as unknown as Worker).postMessage(message, transfer);
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    switch (request.type) {
      case 'open': {
        const session = await ImageSession.open(request.blob, request.options);
        sessions.set(request.sessionId, session);
        reply({ id: request.id, ok: true, result: { width: session.width, height: session.height } });
        break;
      }
      case 'encode': {
        const buffer = await requireSession(request.sessionId).encode(request.params);
        reply({ id: request.id, ok: true, result: buffer }, [buffer]);
        break;
      }
      case 'similarity': {
        const ssim = await requireSession(request.sessionId).similarity(request.candidate, request.sampleWidth);
        reply({ id: request.id, ok: true, result: ssim });
        break;
      }
      case 'close': {
        sessions.delete(request.sessionId);
        reply({ id: request.id, ok: true, result: undefined });
        break;
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    reply({ id: request.id, ok: false, error: { name: err.name, message: err.message } });
  }
};
