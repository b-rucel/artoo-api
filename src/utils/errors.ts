import { corsHeaders } from "../middleware/cors";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleError(error: Error): Response {
  console.error('Error:', error);

  if (error instanceof ApiError) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: error.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  return new Response(JSON.stringify({
    error: 'Internal Server Error'
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}