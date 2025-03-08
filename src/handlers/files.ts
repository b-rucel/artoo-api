import { corsHeaders, handleCors } from '../middleware/cors';
import { handleError, ApiError } from '../utils/errors';


/**
 * Handles CORS preflight requests for the API endpoints
 * @param {Request} request - The incoming HTTP request object
 * @returns {Response} A response with appropriate CORS headers
 */
export const handleCorsRequest = (request: Request) => {
  return handleCors(request) || new Response(null, {
    headers: corsHeaders
  });
};


/**
 * Handles the file list request.
 * @param request Request object
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @query path - filter for the files
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFilesList = async (request: Request, env: Env, context: ExecutionContext) => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || "";
    const objects = await env.ARTOO_BUCKET.list({ prefix: path });

    const files = objects.objects.map(obj => ({
      name: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      etag: obj.etag,
    }));

    return new Response(JSON.stringify({ files }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return handleError(error as Error);
  }
}


/**
 * Handles serving a file directly in the browser.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with the file content and appropriate headers.
 */
export const handleFileServe = async (request: Request, env: Env, context: ExecutionContext) => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const path = pathSegments.slice(3).join('/'); // root/api/details/path -> path

    const object = await env.ARTOO_BUCKET.get(path);

    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Length': object.size.toString(),
        'ETag': object.etag,
        'Last-Modified': object.uploaded.toISOString(),
        ...corsHeaders,
      },
    });

  } catch (error) {
    return handleError(error as Error);
  }
}


/**
 * Handles the file details request.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFileDetails = async (request: Request, env: Env, context: ExecutionContext) => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const path = pathSegments.slice(3).join('/'); // root/api/details/path -> path

    // maybe do a valid path check?
    const object = await env.ARTOO_BUCKET.get(path);

    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return new Response(JSON.stringify({ object }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return handleError(error as Error);
  }
}


/**
 * Handles the file download request.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFileDownload = async (request: Request, env: Env, context: ExecutionContext) => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const path = pathSegments.slice(3).join('/'); // root/api/details/path -> path

    const object = await env.ARTOO_BUCKET.get(path);

    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Length': object.size.toString(),
        'ETag': object.etag,
        'Last-Modified': object.uploaded.toISOString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(path.split('/').pop() || '')}"`,
        ...corsHeaders,
      },
    });

  } catch (error) {
    return handleError(error as Error);
  }
}


/**
 * Handles the file upload request.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFileUpload = async (request: Request, env: Env, context: ExecutionContext) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const path = pathSegments.slice(3).join('/');

    // Check if we have a file in the request
    const contentType = request.headers.get('content-type');
    if (!contentType) {
      throw new ApiError(400, 'Missing content-type header');
    }

    // Get the file data from the request
    const fileData = await request.arrayBuffer();
    if (fileData.byteLength === 0) {
      throw new ApiError(400, 'Empty file content');
    }

    // Upload the file to R2
    const uploadResult = await env.ARTOO_BUCKET.put(path, fileData, {
      httpMetadata: {
        contentType: contentType,
      },
    });

    if (!uploadResult) {
      throw new ApiError(500, 'Failed to upload file');
    }

    // Return success response with file details
    return new Response(JSON.stringify({
      message: 'File uploaded successfully',
      key: path,
      etag: uploadResult.etag,
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return handleError(error as Error);
  }
}


/**
 * Handles the file delete request.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFileDelete = async (request: Request, env: Env, context: ExecutionContext) => {
  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const path = pathSegments.slice(3).join('/');

    // Check if file exists before deleting
    const object = await env.ARTOO_BUCKET.get(path);
    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Delete the file from R2
    await env.ARTOO_BUCKET.delete(path);

    return new Response(JSON.stringify({
      message: 'File deleted successfully',
      key: path,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return handleError(error as Error);
  }
}


/**
 * Handles the file move request.
 * Moves a file from source path to destination path.
 * 
 * @param request Request containing source and destination paths
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers
 */
export const handleFileMove = async (request: Request, env: Env, context: ExecutionContext) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }


  try {
    const { destination } = await request.json() as { destination: string };
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const sourcePath = pathSegments.slice(3).join('/');

    if (!destination) {
      throw new ApiError(400, 'Destination path is required');
    }

    // Get the source file
    const sourceObject = await env.ARTOO_BUCKET.get(sourcePath);
    if (!sourceObject) {
      throw new ApiError(404, 'Source file not found');
    }

    // Copy the file to the new location
    const uploadResult = await env.ARTOO_BUCKET.put(destination, sourceObject.body, {
      httpMetadata: sourceObject.httpMetadata
    });

    if (!uploadResult) {
      throw new ApiError(500, 'Failed to move file');
    }

    // Delete the source file
    await env.ARTOO_BUCKET.delete(sourcePath);

    return new Response(JSON.stringify({
      message: 'File moved successfully',
      from: sourcePath,
      to: destination,
      etag: uploadResult.etag,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return handleError(error as Error);
  }
}


/**
 * Handles the file copy request.
 * Copies a file from source path to destination path.
 * 
 * @param request Request containing source and destination paths
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers
 */
export const handleFileCopy = async (request: Request, env: Env, context: ExecutionContext) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const { destination } = await request.json() as { destination: string };
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const sourcePath = pathSegments.slice(3).join('/');

    if (!destination) {
      throw new ApiError(400, 'Destination path is required');
    }

    // Get the source file
    const sourceObject = await env.ARTOO_BUCKET.get(sourcePath);
    if (!sourceObject) {
      throw new ApiError(404, 'Source file not found');
    }

    // Copy the file to the new location
    const uploadResult = await env.ARTOO_BUCKET.put(destination, sourceObject.body, {
      httpMetadata: sourceObject.httpMetadata
    });

    if (!uploadResult) {
      throw new ApiError(500, 'Failed to copy file');
    }

    return new Response(JSON.stringify({
      message: 'File copied successfully',
      from: sourcePath,
      to: destination,
      etag: uploadResult.etag,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return handleError(error as Error);
  }
}




/**
 * Handles the file update request.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFileUpdate = async (request: Request, env: Env, context: ExecutionContext) => {
}