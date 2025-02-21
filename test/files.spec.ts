// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';

import { handleFilesList } from '../src/handlers/files';
import { corsHeaders } from '../src/middleware/cors';
import { handleFileDetails } from '../src/handlers/files';

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


describe('handleFileDetails', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ARTOO_BUCKET: {
        get: vi.fn()
      }
    };
  });

  it('should return file details', async () => {
    const mockObject = {
      key: 'test.txt',
      size: 100,
      uploaded: '2024-01-01',
      etag: 'abc123'
    };

    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockObject);

    const request = new Request('http://localhost/files/test.txt');
    const response = await handleFileDetails(request, mockEnv, {} as ExecutionContext);
    const data = await response.json();

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(corsHeaders['Access-Control-Allow-Origin']);
    expect(data).toEqual({ object: mockObject });
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('test.txt');
  });

  it('should handle non-existent files', async () => {
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(null);

    const request = new Request('http://localhost/files/nonexistent.txt');
    const response = await handleFileDetails(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: 'File not found' });
  });
});