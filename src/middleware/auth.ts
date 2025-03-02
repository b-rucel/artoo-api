import jwt from '@tsndr/cloudflare-worker-jwt';
import { corsHeaders } from './cors';
import { ApiError } from '../utils/errors';

export interface JWTPayload {
  sub: string;  // user id
  username: string;
  exp: number;  // expiration time
}

/**
 * Verifies the JWT token from the Authorization header
 *
 * @param {Request} request - The incoming request
 * @param {Env} env - The environment variables
 * @returns {Promise<JWTPayload>} The decoded JWT payload
 * @throws {ApiError} if token is invalid or missing
 */
export async function verifyAuth(request: Request, env: Env): Promise<JWTPayload> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];

  try {
    // verify the token
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) {
      throw new ApiError(401, 'Invalid token');
    }

    // Decode the payload
    const decoded = jwt.decode(token);
    const payload = decoded.payload as JWTPayload;

    // Check if token is expired
    if (payload.exp < Date.now() / 1000) {
      throw new ApiError(401, 'Token expired');
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Invalid token');
  }
}

/**
 * Middleware to protect routes with JWT authentication
 */
export function withAuth(handler: Function) {
  return async (request: Request, env: Env, ctx: ExecutionContext) => {
    try {
      await verifyAuth(request, env);
      return handler(request, env, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: error.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      throw error;
    }
  };
}