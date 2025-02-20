import { corsHeaders } from '../middleware/cors';

export const handleHealth = () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
