
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