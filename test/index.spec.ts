// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('API Tests', () => {
  describe('Health Check', () => {
    it('should return ok status', async () => {
      const request = new IncomingRequest('http://localhost:8787/health');
      const ctx = createExecutionContext();

      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });
  });

  describe('File Operations', () => {
    it('should return 501 for unimplemented file list', async () => {
      const request = new IncomingRequest('http://localhost:8787/api/files');
      const ctx = createExecutionContext();

      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);

      const text = await response.text();
      expect(text).toBe('Not implemented');
    });
  });
});
