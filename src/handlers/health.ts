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

/**
 * Handles the 404 request.
 * @returns A response with a JSON body and CORS headers.
 */
export const handle404 = () => {
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
