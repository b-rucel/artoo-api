/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { AutoRouter } from 'itty-router'
import { handleHealth, handle404 } from './handlers/health';
import * as files from './handlers/files';

export const router = AutoRouter()

// health check
router.get('/health', handleHealth);

// files
router.get('/api/files', files.handleFilesList);
router.get('/api/files/*', files.handleFileServe);
router.get('/api/details/*', files.handleFileDetails);
router.get('/api/download/*', files.handleFileDownload);


// router.post('/api/files/:path', files.handleFileUpload);
// router.delete('/api/files/:path', files.handleFileDelete);
// router.put('/api/files/:path', files.handleFileUpdate);


// 404 handler - this must be the last route
router.all('*', handle404);

export default router
