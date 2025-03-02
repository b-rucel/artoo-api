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

These can all be created in any order but I like to start with the worker then move onto the bucket and namespace to configure them to the worker.


### Create Worker

npx wrangler generate my-worker https://github.com/b-rucel/artoo-api <project-name>

configure the following settings with your Cloudflare resource values.

### Configuration

The API is configured through `wrangler.jsonc` configuration file in the project root:

Configure the following settings with your Cloudflare resource values:
```json
{
  "name": "<your-project-name>",
  "main": "src/index.ts",
  "compatibility_date": "<compatibility_date>",
  "r2_buckets": [
    {
      "binding": "ARTOO_BUCKET",
      "bucket_name": "<bucket-name>"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "ARTOO",
      "id": "<kv-namespace-id>"
    }
  ]
}
```

create cloudflare resources to fill in the configuration values

1. Create the buckets
```bash
npx wrangler r2 bucket create <bucket-name>
```

2. Create KV Namespaces
```bash
npx wrangler kv:namespace create ARTOO
>>>
Add the following to your configuration file in your kv_namespaces array:
{
  "kv_namespaces": [
    {
      "binding": "ARTOO",
      "id": "d6e88610952a47fd996a3c1b0e4bbf06"
    }
  ]
}
```

3. Add secret to application
```bash
npm wrangler secret put JWT_SECRET <your-secret>
```
*Use a strong, unique JWT secret*




## Local Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or bun package manager
- A Cloudflare account with:
  - R2 bucket created
  - KV namespace created
  - Worker deployed

### Installation

1. Clone the repository:
```bash
git clone https://github.com/b-rucel/artoo-api.git
cd artoo-api
```



