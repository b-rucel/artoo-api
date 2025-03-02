# Artoo API

A cloud-based file management solution built on Cloudflare's edge infrastructure.
Artoo API is the backend component of the Artoo file management system. It provides secure file operations and user authentication through Cloudflare Workers and R2 storage.

## Features

- **Secure File Operations**:
  - Upload files with multipart form support
  - Download files with proper content types
  - List files and directories with metadata
  - Get detailed file information
- **Authentication & Authorization**:
  - JWT-based secure authentication
  - Token validation and verification
- **Edge Computing**:
  - Built on Cloudflare Workers for global low-latency performance
  - Uses Cloudflare R2 for object storage

## API Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Health check endpoint | No |
| `/api/files` | GET | List files and directories | No |
| `/api/files/*` | GET | Serve file contents | No |
| `/api/details/*` | GET | Get file metadata | No |
| `/api/download/*` | GET | Download file with content-disposition | No |
| `/api/files/*` | POST | Upload file | Yes |
| `/api/auth/login` | POST | Authenticate user | No |
| `/api/auth/verify` | POST | Verify JWT token | No |

### Self-Hosting Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or bun package manager
- A Cloudflare account with:
  - R2 bucket
  - KV namespace
  - Worker


