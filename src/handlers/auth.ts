import jwt from '@tsndr/cloudflare-worker-jwt';
import { corsHeaders } from '../middleware/cors';
import { ApiError, handleError } from '../utils/errors';
import { JWTPayload } from '../middleware/auth';
import { Env, LoginData } from '../types/env';


/**
 * Handles the login request.
 * Expects username and password in request body as JSON: { "username": "user", "password": "pass" }
 *
 * @param {Request} request - The incoming HTTP request
 * @param {Env} env - Environment variables and bindings
 * @returns {Promise<Response>} JSON response with JWT token or error message with appropriate status code
 *
 * @example
 * // Request body
 * { "username": "user", "password": "pass" }
 *
 * // Success response
 * { "token": "{ "token": "..." }
 *
 * // Error response
 * { "error": "Invalid credentials" }
 */
export const handleLogin = async (request: Request, env: Env) => {
  if (request.method !== 'POST') {
    return handleError(new ApiError(405, 'Method not allowed'));
  }

  try {
    const { username, password } = await request.json() as LoginData;

    if (!username || !password) {
      return handleError(new ApiError(400, 'Username and password are required'));
    }

    // Get the stored password from KV
    const storedPassword = await env.ARTOO.get(username);

    if (!storedPassword) {
      return handleError(new ApiError(401, 'Invalid credentials'));
    }

    // Compare the passwords
    if (password !== storedPassword) {
      return handleError(new ApiError(401, 'Invalid credentials'));
    }

    // Create JWT token
    const payload: JWTPayload = {
      sub: username,
      username: username,
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    };

    const token = await jwt.sign(payload, env.JWT_SECRET);

    return new Response(JSON.stringify({ token }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    return handleError(new ApiError(500, 'Internal server error'));
  }
};


/**
 * Verifies a JWT token's validity and expiration
 * Expects token in request body as JSON: { "token": "jwt-token-string" }
 *
 * @param {Request} request - The incoming HTTP request
 * @param {Env} env - Environment variables and bindings
 * @returns {Promise<Response>} JSON response with validation result and payload
 *                             or error message with appropriate status code
 * @example
 * // Request body
 * { "token": "eyJhbGciOiJIUzI1..." }
 *
 * // Success response
 * { "valid": true, "payload": { "sub": "user", "username": "user", "exp": 1234567890 } }
 *
 * // Error response
 * { "error": "Token is required" }
 */
export const handleVerify = async (request: Request, env: Env) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    const body = await request.json() as { token: string };
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Verify token
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Decode and check expiration
    const decoded = jwt.decode(token);
    const payload = decoded.payload as JWTPayload;

    if (payload.exp < Date.now() / 1000) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    return new Response(JSON.stringify({ valid: true, payload }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};