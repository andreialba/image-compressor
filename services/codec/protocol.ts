import type { DecodeOptions, EncodeParams } from './engine';

export type WorkerRequest =
  | { id: number; type: 'open'; sessionId: string; blob: Blob; options: DecodeOptions }
  | { id: number; type: 'encode'; sessionId: string; params: EncodeParams }
  | { id: number; type: 'similarity'; sessionId: string; candidate: Blob; sampleWidth: number }
  | { id: number; type: 'close'; sessionId: string };

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: { name: string; message: string } };
