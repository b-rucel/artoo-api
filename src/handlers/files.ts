
import { corsHeaders } from '../middleware/cors';
import { handleError, ApiError } from '../utils/errors';


/**
 * Handles the file list request.
 * @param env Environment containing R2 bucket binding
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
    const objects = await env.ARTOO_BUCKET.list();

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
    // @ts-ignore
    const { path } = request.params;
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
    console.log(error);
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
    // @ts-ignore
    const { path } = request.params;
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
}

/**
 * Handles the file delete request.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFileDelete = async (request: Request, env: Env, context: ExecutionContext) => {
}

/**
 * Handles the file update request.
 * @param env Environment containing R2 bucket binding
 * @param context Execution context
 * @returns A response with a JSON body and CORS headers.
 */
export const handleFileUpdate = async (request: Request, env: Env, context: ExecutionContext) => {
}