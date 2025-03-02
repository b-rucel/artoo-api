/**
 * Artoo API 
 * A cloud-based file management solution built on Cloudflare's edge infrastructure.
 *
 * Main router configuration and endpoint definitions.
 *
 * Core features:
 * - File management (upload, download, list, details)
 * - Authentication (login, token verification)
 * - Health monitoring
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 */

import { AutoRouter } from 'itty-router'
import { handleHealth, handle404 } from './handlers/health';
import * as files from './handlers/files';
import * as auth from './handlers/auth';
import { withAuth } from './middleware/auth';

export const router = AutoRouter()

// health check
router.get('/health', handleHealth);

// files
router.get('/api/files', files.handleFilesList);
router.get('/api/files/*', files.handleFileServe);
router.get('/api/details/*', files.handleFileDetails);
router.get('/api/download/*', files.handleFileDownload);

router.options('/api/files/*', files.handleCorsRequest);
router.post('/api/files/*', withAuth(files.handleFileUpload));

// auth
router.options('/api/auth/*', files.handleCorsRequest);
router.post('/api/auth/login', auth.handleLogin);
router.post('/api/auth/verify', auth.handleVerify);

// router.delete('/api/files/:path', files.handleFileDelete);
// router.put('/api/files/:path', files.handleFileUpdate);

// 404 handler - this must be the last route
router.all('*', handle404);

export default router
