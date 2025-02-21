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
    it('should return list of files', async () => {
      const request = new IncomingRequest('http://localhost:8787/api/files');
      const ctx = createExecutionContext();

      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('files');
      expect(Array.isArray(data.files)).toBe(true);

      // Verify the structure of file objects
      if (data.files.length > 0) {
        expect(data.files[0]).toMatchObject({
          name: expect.any(String),
          size: expect.any(Number),
          uploaded: expect.any(String),
          etag: expect.any(String),
        });
      }
    });
  });
});
