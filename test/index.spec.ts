// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../src/index';

describe('API Tests', () => {
  let ctx: ExecutionContext;

  beforeEach(() => {
    ctx = createExecutionContext();
  });

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const request = new Request('http://localhost/health');
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });
  });

  // describe('File Operations', () => {
  //   it('should return list of files', async () => {
  //     const request = new Request('http://localhost/api/files');
  //     const response = await worker.fetch(request, env, ctx);
  //     await waitOnExecutionContext(ctx);

  //     expect(response.status).toBe(200);
  //     expect(response.headers.get('Content-Type')).toBe('application/json');

  //     const data = await response.json();
  //     expect(data).toHaveProperty('files');
  //     expect(Array.isArray(data.files)).toBe(true);

  //     // Verify the structure of file objects
  //     if (data.files.length > 0) {
  //       expect(data.files[0]).toMatchObject({
  //         name: expect.any(String),
  //         size: expect.any(Number),
  //         uploaded: expect.any(String),
  //         etag: expect.any(String),
  //       });
  //     }
  //   });
  // });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const request = new Request('http://localhost/unknown-route');
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: 'Not Found' });
    });
  });
});
