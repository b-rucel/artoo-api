// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';

import { handleFilesList } from '../src/handlers/files';
import { corsHeaders } from '../src/middleware/cors';
import { handleFileDetails } from '../src/handlers/files';
import { handleFileDownload } from '../src/handlers/files';

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

  it('should handle path prefix filtering', async () => {
    const mockObjects = {
      objects: [
        {
          key: 'folder1/test1.txt',
          size: 100,
          uploaded: '2024-01-01',
          etag: 'abc123'
        },
        {
          key: 'folder1/test2.txt',
          size: 200,
          uploaded: '2024-01-01',
          etag: 'def456'
        }
      ]
    };

    mockEnv.ARTOO_BUCKET.list.mockResolvedValue(mockObjects);

    const request = new Request('http://localhost/api/files?path=folder1/');
    Object.defineProperty(request, 'query', {
      value: { path: 'folder1/' },
      writable: true
    });

    const response = await handleFilesList(request, mockEnv, {} as ExecutionContext);
    const data = await response.json();

    expect(mockEnv.ARTOO_BUCKET.list).toHaveBeenCalledWith({ prefix: 'folder1/' });
    expect(data).toEqual({
      files: [
        {
          name: 'folder1/test1.txt',
          size: 100,
          uploaded: '2024-01-01',
          etag: 'abc123'
        },
        {
          name: 'folder1/test2.txt',
          size: 200,
          uploaded: '2024-01-01',
          etag: 'def456'
        }
      ]
    });
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

    const request = new Request('http://localhost/api/details/test.txt');
    Object.defineProperty(request, 'params', {
      value: { path: 'test.txt' },
      writable: true
    });

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
    Object.defineProperty(request, 'params', {
      value: { path: 'nonexistent.txt' },
      writable: true
    });

    const response = await handleFileDetails(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: 'File not found' });
  });
});


describe('handleFileDownload', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ARTOO_BUCKET: {
        get: vi.fn()
      }
    };
  });

  it('should download a file successfully', async () => {
    const mockObject = {
      body: new Blob(['test content']),
      size: 12,
      etag: 'abc123',
      uploaded: new Date('2024-01-01'),
      httpMetadata: {
        contentType: 'text/plain'
      }
    };

    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockObject);

    const request = new Request('http://localhost/api/download/test.txt');
    Object.defineProperty(request, 'params', {
      value: { path: 'test.txt' },
      writable: true
    });

    const response = await handleFileDownload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(response.headers.get('Content-Length')).toBe('12');
    expect(response.headers.get('ETag')).toBe('abc123');
    expect(response.headers.get('Last-Modified')).toBe(mockObject.uploaded.toISOString());
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="test.txt"');
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('test.txt');
  });

  it('should handle non-existent files', async () => {
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(null);

    const request = new Request('http://localhost/files/nonexistent.txt');
    Object.defineProperty(request, 'params', {
      value: { path: 'nonexistent.txt' },
      writable: true
    });

    const response = await handleFileDownload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: 'File not found' });
  });

  it('should return 405 for non-GET requests', async () => {
    const request = new Request('http://localhost/files/test.txt', { method: 'POST' });
    const response = await handleFileDownload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data).toEqual({ error: 'Method Not Allowed' });
  });

  it('should use default content type if not specified', async () => {
    const mockObject = {
      body: new Blob(['test content']),
      size: 12,
      etag: 'abc123',
      uploaded: new Date('2024-01-01'),
      httpMetadata: {}  // No content type specified
    };

    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockObject);

    const request = new Request('http://localhost/files/test.txt');
    Object.defineProperty(request, 'params', {
      value: { path: 'test.txt' },
      writable: true
    });

    const response = await handleFileDownload(request, mockEnv, {} as ExecutionContext);

    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
  });
});


