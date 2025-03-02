import { corsHeaders } from "../middleware/cors";

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handles an error by logging it and returning a Response object with the error details.
 * 
 * @param error - The error to be handled.
 * @returns A Response object containing the error message and appropriate HTTP status code.
 * 
 */
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