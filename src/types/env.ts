import { R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  ARTOO_BUCKET: R2Bucket;
  ARTOO: KVNamespace;
  JWT_SECRET: string;
}