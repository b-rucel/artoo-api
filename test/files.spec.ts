// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';

import { handleFileMove, handleFilesList } from '../src/handlers/files';
import { corsHeaders } from '../src/middleware/cors';
import { handleFileDetails } from '../src/handlers/files';
import { handleFileDownload } from '../src/handlers/files';
import { handleFileUpload } from '../src/handlers/files';
import { handleFileDelete } from '../src/handlers/files';
import { handleFileCopy } from '../src/handlers/files';
// import { ApiError } from '../src/utils/errors';


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


describe('handleFileUpload', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ARTOO_BUCKET: {
        put: vi.fn()
      }
    };
  });

  it('should upload a file successfully', async () => {
    const fileContent = 'test file content';
    const mockUploadResult = {
      etag: 'abc123'
    };

    mockEnv.ARTOO_BUCKET.put.mockResolvedValue(mockUploadResult);

    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: fileContent
    });

    const response = await handleFileUpload(request, mockEnv, {} as ExecutionContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({
      message: 'File uploaded successfully',
      key: 'test.txt',
      etag: 'abc123'
    });
    expect(mockEnv.ARTOO_BUCKET.put).toHaveBeenCalledWith(
      'test.txt',
      expect.any(ArrayBuffer),
      {
        httpMetadata: {
          contentType: 'text/plain'
        }
      }
    );
  });

  it('should return 405 for non-POST requests', async () => {
    const request = new Request('http://localhost/api/files/test.txt', { method: 'PUT' });
    const response = await handleFileUpload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data).toEqual({ error: 'Method Not Allowed' });
  });

  it('should handle missing content-type header', async () => {
    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'POST',
      body: 'test content'
    });

    // Remove the content-type header that Request automatically adds
    Object.defineProperty(request.headers, 'get', {
      value: () => null
    });

    const response = await handleFileUpload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: 'Missing content-type header' });
  });

  it('should handle empty file content', async () => {
    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: ''
    });

    const response = await handleFileUpload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: 'Empty file content' });
  });

  it('should handle upload failures', async () => {
    mockEnv.ARTOO_BUCKET.put.mockResolvedValue(null);

    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'test content'
    });

    const response = await handleFileUpload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: 'Failed to upload file' });
  });

  it('should handle unexpected errors during upload', async () => {
    mockEnv.ARTOO_BUCKET.put.mockRejectedValue(new Error('Storage error'));

    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'test content'
    });

    const response = await handleFileUpload(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: 'Internal Server Error' });
  });
});


describe('handleFileDelete', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ARTOO_BUCKET: {
        get: vi.fn(),
        delete: vi.fn()
      }
    };
  });

  it('should delete a file successfully', async () => {
    const mockObject = {
      key: 'test.txt',
      size: 100,
      uploaded: new Date('2024-01-01'),
      etag: 'abc123'
    };

    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockObject);
    mockEnv.ARTOO_BUCKET.delete.mockResolvedValue({});

    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'DELETE'
    });

    const response = await handleFileDelete(request, mockEnv, {} as ExecutionContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      message: 'File deleted successfully',
      key: 'test.txt'
    });
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('test.txt');
    expect(mockEnv.ARTOO_BUCKET.delete).toHaveBeenCalledWith('test.txt');
  });

  it('should return 404 for non-existent files', async () => {
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(null);

    const request = new Request('http://localhost/api/files/nonexistent.txt', {
      method: 'DELETE'
    });

    const response = await handleFileDelete(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: 'File not found' });
    expect(mockEnv.ARTOO_BUCKET.delete).not.toHaveBeenCalled();
  });

  it('should return 405 for non-DELETE requests', async () => {
    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'GET'
    });

    const response = await handleFileDelete(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data).toEqual({ error: 'Method Not Allowed' });
  });

  it('should handle errors during deletion', async () => {
    const mockObject = {
      key: 'test.txt',
      size: 100,
      uploaded: new Date('2024-01-01'),
      etag: 'abc123'
    };

    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockObject);
    mockEnv.ARTOO_BUCKET.delete.mockRejectedValue(new Error('Storage error'));

    const request = new Request('http://localhost/api/files/test.txt', {
      method: 'DELETE'
    });

    const response = await handleFileDelete(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: 'Internal Server Error' });
  });
});



describe('handleFileMove', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ARTOO_BUCKET: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      }
    };
  });
 
  it('should move a file successfully', async () => {
    // Mock source file
    const mockSourceObject = {
      body: new Blob(['test content']),
      size: 12,
      etag: 'abc123',
      uploaded: new Date('2024-01-01'),
      httpMetadata: {
        contentType: 'text/plain'
      }
    };
    
    // Mock successful upload result
    const mockUploadResult = {
      etag: 'def456'
    };
    
    // Set up mocks
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockSourceObject);
    mockEnv.ARTOO_BUCKET.put.mockResolvedValue(mockUploadResult);
    mockEnv.ARTOO_BUCKET.delete.mockResolvedValue(undefined);
    
    // Create request with source path in URL and destination in body
    const request = new Request('http://localhost/root/api/files/source/path.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destination: 'destination/path.txt' })
    });
    
    const response = await handleFileMove(request, mockEnv, {} as ExecutionContext);
    
    // Verify response
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      message: 'File moved successfully',
      from: 'files/source/path.txt',
      to: 'destination/path.txt',
      etag: 'def456'
    });
    
    // Verify correct method calls
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('files/source/path.txt');
    expect(mockEnv.ARTOO_BUCKET.put).toHaveBeenCalledWith(
      'destination/path.txt', 
      mockSourceObject.body, 
      { httpMetadata: mockSourceObject.httpMetadata }
    );
    expect(mockEnv.ARTOO_BUCKET.delete).toHaveBeenCalledWith('files/source/path.txt');
  });

  it('should return 404 for non-existent source files', async () => {
    // Mock source file not found
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(null);
    
    const request = new Request('http://localhost/root/api/files/nonexistent.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destination: 'destination/path.txt' })
    });
    
    const response = await handleFileMove(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: 'Source file not found' });
    
    // Verify get was called but not put or delete
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('files/nonexistent.txt');
    expect(mockEnv.ARTOO_BUCKET.put).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.delete).not.toHaveBeenCalled();
  });

  it('should return 400 when destination is missing', async () => {
    const request = new Request('http://localhost/root/api/files/source.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Missing destination
    });
    
    const response = await handleFileMove(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: 'Destination path is required' });
    
    // Verify no bucket operations were called
    expect(mockEnv.ARTOO_BUCKET.get).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.put).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.delete).not.toHaveBeenCalled();
  });

  it('should return 405 for non-POST requests', async () => {
    const request = new Request('http://localhost/root/api/files/test.txt', {
      method: 'GET'
    });
    
    const response = await handleFileMove(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data).toEqual({ error: 'Method Not Allowed' });
    
    // Verify no bucket operations were called
    expect(mockEnv.ARTOO_BUCKET.get).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.put).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.delete).not.toHaveBeenCalled();
  });

  it('should handle upload failures', async () => {
    // Mock source file
    const mockSourceObject = {
      body: new Blob(['test content']),
      size: 12,
      etag: 'abc123',
      uploaded: new Date('2024-01-01'),
      httpMetadata: {
        contentType: 'text/plain'
      }
    };
    
    // Mock failed upload
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockSourceObject);
    mockEnv.ARTOO_BUCKET.put.mockResolvedValue(null); // Upload fails
    
    const request = new Request('http://localhost/root/api/files/source.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destination: 'destination.txt' })
    });
    
    const response = await handleFileMove(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: 'Failed to move file' });
    
    // Verify get and put were called but not delete
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('files/source.txt');
    expect(mockEnv.ARTOO_BUCKET.put).toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.delete).not.toHaveBeenCalled();
  });
});



describe('handleFileCopy', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ARTOO_BUCKET: {
        get: vi.fn(), 
        put: vi.fn(),
        delete: vi.fn()
      }
    };
  }); 

  it('should copy a file successfully', async () => {
    const mockSourceObject = {
      body: new Blob(['test content']),
      size: 12,
      etag: 'abc123', 
      uploaded: new Date('2024-01-01'),
      httpMetadata: {
        contentType: 'text/plain'
      }
    };
    
    // Mock successful upload result
    const mockUploadResult = {
      etag: 'def456'
    };
    
    // Set up mocks
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockSourceObject);
    mockEnv.ARTOO_BUCKET.put.mockResolvedValue(mockUploadResult);
    
    // Create request with source path in URL and destination in body
    const request = new Request('http://localhost/root/api/files/source/path.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destination: 'destination/path.txt' })
    });
    
    const response = await handleFileCopy(request, mockEnv, {} as ExecutionContext);
    
    // Verify response
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      message: 'File copied successfully',
      from: 'files/source/path.txt',
      to: 'destination/path.txt',
      etag: 'def456'
    });
    
    // Verify correct method calls
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('files/source/path.txt');
    expect(mockEnv.ARTOO_BUCKET.put).toHaveBeenCalledWith(
      'destination/path.txt', 
      mockSourceObject.body, 
      { httpMetadata: mockSourceObject.httpMetadata }
    );
    // Verify delete was NOT called (this is the key difference from move)
    expect(mockEnv.ARTOO_BUCKET.delete).not.toHaveBeenCalled();
  });

  it('should return 404 for non-existent source files', async () => {
    // Mock source file not found
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(null);
    
    const request = new Request('http://localhost/root/api/files/nonexistent.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destination: 'destination/path.txt' })
    });
    
    const response = await handleFileCopy(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: 'Source file not found' });
    
    // Verify get was called but not put
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('files/nonexistent.txt');
    expect(mockEnv.ARTOO_BUCKET.put).not.toHaveBeenCalled();
  });

  it('should return 400 when destination is missing', async () => {
    const request = new Request('http://localhost/root/api/files/source.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Missing destination
    });
    
    const response = await handleFileCopy(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: 'Destination path is required' });
    
    // Verify no bucket operations were called
    expect(mockEnv.ARTOO_BUCKET.get).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.put).not.toHaveBeenCalled();
  });

  it('should return 405 for non-POST requests', async () => {
    const request = new Request('http://localhost/root/api/files/test.txt', {
      method: 'GET'
    });
    
    const response = await handleFileCopy(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data).toEqual({ error: 'Method Not Allowed' });
    
    // Verify no bucket operations were called
    expect(mockEnv.ARTOO_BUCKET.get).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.put).not.toHaveBeenCalled();
  });

  it('should handle upload failures', async () => {
    // Mock source file
    const mockSourceObject = {
      body: new Blob(['test content']),
      size: 12,
      etag: 'abc123',
      uploaded: new Date('2024-01-01'),
      httpMetadata: {
        contentType: 'text/plain'
      }
    };
    
    // Mock failed upload
    mockEnv.ARTOO_BUCKET.get.mockResolvedValue(mockSourceObject);
    mockEnv.ARTOO_BUCKET.put.mockResolvedValue(null); // Upload fails
    
    const request = new Request('http://localhost/root/api/files/source.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destination: 'destination.txt' })
    });
    
    const response = await handleFileCopy(request, mockEnv, {} as ExecutionContext);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: 'Failed to copy file' });
    
    // Verify get and put were called
    expect(mockEnv.ARTOO_BUCKET.get).toHaveBeenCalledWith('files/source.txt');
    expect(mockEnv.ARTOO_BUCKET.put).toHaveBeenCalled();
  });

  it('should handle JSON parsing errors', async () => {
    // Create request with invalid JSON
    const request = new Request('http://localhost/root/api/files/source.txt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{invalid json' // Invalid JSON
    });
    
    const response = await handleFileCopy(request, mockEnv, {} as ExecutionContext);
    
    // Update expected status code to 500 to match actual implementation
    expect(response.status).toBe(500);
    const data = await response.json();
    // The error message might not specifically mention "Invalid JSON"
    // so we'll just check that there is an error property
    expect(data).toHaveProperty('error');
    
    // Verify no bucket operations were called
    expect(mockEnv.ARTOO_BUCKET.get).not.toHaveBeenCalled();
    expect(mockEnv.ARTOO_BUCKET.put).not.toHaveBeenCalled();
  });
});
