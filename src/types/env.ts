import { R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  ARTOO_BUCKET: R2Bucket;
  // Add other environment variables here as needed
}