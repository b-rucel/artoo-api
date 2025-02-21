// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';

import { handleFilesList } from '../src/handlers/files';
import { corsHeaders } from '../src/middleware/cors';

describe('handleFilesList', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ARTOO_BUCKET: {
        list: vi.fn()
      }
    };
  });

  it('should return a list of files', async () => {
    const mockObjects = {
      objects: [
        {
          key: 'test.txt',
          size: 100,
          uploaded: '2024-01-01',
          etag: 'abc123'
        }
      ]
    };

    mockEnv.ARTOO_BUCKET.list.mockResolvedValue(mockObjects);

    const request = new Request('http://localhost', { method: 'GET' });
    const response = await handleFilesList(request, mockEnv, {} as ExecutionContext);
    const data = await response.json();

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(corsHeaders['Access-Control-Allow-Origin']);
    expect(data).toEqual({
      files: [{
        name: 'test.txt',
        size: 100,
        uploaded: '2024-01-01',
        etag: 'abc123'
      }]
    });
  });

  it('should return 405 for non-GET requests', async () => {
    const request = new Request('http://localhost', { method: 'POST' });
    const response = await handleFilesList(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data).toEqual({ error: 'Method Not Allowed' });
  });

  it('should handle errors appropriately', async () => {
    mockEnv.ARTOO_BUCKET.list.mockRejectedValue(new Error('Bucket error'));

    const request = new Request('http://localhost', { method: 'GET' });
    const response = await handleFilesList(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(500);
  });
});