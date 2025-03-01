import jwt from '@tsndr/cloudflare-worker-jwt';
import { corsHeaders } from '../middleware/cors';
import { ApiError } from '../utils/errors';
import { JWTPayload } from '../middleware/auth';

export const handleLogin = async (request: Request, env: Env) => {
  if (request.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed');
  }

  try {
    // @ts-ignore
    const { username, password } = await request.json();

    if (!username || !password) {
      throw new ApiError(400, 'Username and password are required');
    }

    // @ts-ignore Get the stored password from KV
    const storedPassword = await env.ARTOO.get(username);

    if (!storedPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Compare the passwords
    if (password !== storedPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Create JWT token
    const payload: JWTPayload = {
      sub: username, // use username as the subject
      username: username,
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    };

    // @ts-ignore
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
    throw new ApiError(500, 'Internal server error');
  }
};

export const handleVerify = async (request: Request, env: Env) => {
  if (request.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed');
  }

  try {
    const body = await request.json() as { token: string };
    const { token } = body;

    if (!token) {
      throw new ApiError(400, 'Token is required');
    }

    // @ts-ignore Verify token
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) {
      throw new ApiError(401, 'Invalid token');
    }

    // Decode and check expiration
    const decoded = jwt.decode(token);
    const payload = decoded.payload as JWTPayload;

    if (payload.exp < Date.now() / 1000) {
      throw new ApiError(401, 'Token expired');
    }

    return new Response(JSON.stringify({ valid: true, payload }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Internal server error');
  }
};