import { corsHeaders } from '../middleware/cors';

/**
 * Handles the health check request.
 * @returns A response with a JSON body and CORS headers.
 */
export const handleHealth = () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
