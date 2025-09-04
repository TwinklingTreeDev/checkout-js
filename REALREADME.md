# Checkout.js Development Guide

## Local Development Setup

### Prerequisites
- Node.js 20.0.0

### Installation
```bash
npm install
```

### Development Commands

#### Build and Watch for Changes
```bash
npm run dev
```
This command builds the project for local development and automatically watches for file changes.

#### Run Local Server
```bash
npm run dev:server
```
This command starts a localhost server for testing the application.

## Deployment Steps

### 1. Prepare for Deployment
1. Login to BigCommerce and download the WebDAV credentials
2. Install Cyberduck (if not already installed) - a WebDAV client for file uploads

### 2. Build Production Version
```bash
npm run build
```
This creates a production-ready build with optimized files.

### 3. Deploy Files
1. Upload all built files to BigCommerce WebDAV using Cyberduck
2. Ensure all files are properly uploaded to the correct directory
- Checkout directory is located at dav/content/{checkout-js-folder}

### 4. Generate SRI Hash
After uploading, generate the Subresource Integrity (SRI) hash for the auto-loader file:

```bash
openssl dgst -sha256 -binary auto-loader.js | openssl base64 -A
```

**Note:** If OpenSSL is not available, download and install it first.

### 5. Configure BigCommerce
1. Copy the generated hash
2. In BigCommerce checkout settings, add the SRI hash in the following format:
   ```
   sha256-{generated hash key}
   ```

## Troubleshooting

- If OpenSSL command fails, ensure OpenSSL is properly installed and accessible from your command line
- Verify all files are uploaded correctly to WebDAV before generating the SRI hash
- Double-check the SRI hash format includes the `sha256-` prefix
