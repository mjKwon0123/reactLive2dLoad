# Live2D Model Security Guide

This document outlines security considerations and implementation strategies for protecting user-uploaded Live2D models in a web application.

## Table of Contents

- [Current Implementation](#current-implementation)
- [Security Levels](#security-levels)
- [Implementation Options](#implementation-options)
  - [Level 1: Obfuscation (Current)](#level-1-obfuscation-current)
  - [Level 2: Signed URLs](#level-2-signed-urls)
  - [Level 3: Server-Side Authentication](#level-3-server-side-authentication)
  - [Level 4: Encryption](#level-4-encryption)
- [Recommended Architecture](#recommended-architecture)
- [Implementation Examples](#implementation-examples)

---

## Current Implementation

The current setup uses Vite's asset import system (`import.meta.glob`) to:

1. Store model files in `src/assets/` instead of `public/`
2. Generate hashed filenames during build (e.g., `Haru-B_Kvcr7l.moc3`)
3. Make URL guessing more difficult

**Limitations:**
- URLs are still visible in browser DevTools (Network tab)
- Anyone with the URL can access the file
- Not suitable for sensitive user-uploaded content

---

## Security Levels

| Level | Method | Protection | Performance | Complexity |
|-------|--------|------------|-------------|------------|
| 1 | Obfuscation | Low | High | Low |
| 2 | Signed URLs | Medium | High | Medium |
| 3 | Server Auth | High | Medium | Medium |
| 4 | Encryption | Very High | Low | High |

---

## Implementation Options

### Level 1: Obfuscation (Current)

**How it works:**
- Files are bundled with hashed names
- No direct URL mapping to original filenames

```typescript
// ModelLoader.ts (current implementation)
const modelFiles = import.meta.glob('/src/assets/**/*', {
  eager: true,
  query: '?url',
  import: 'default',
});
```

**Pros:**
- Zero runtime overhead
- Simple implementation
- Works with static hosting

**Cons:**
- URLs visible in network requests
- No access control

---

### Level 2: Signed URLs

**How it works:**
- Generate time-limited, signed URLs for each asset
- URLs expire after a short period
- Requires backend service

```typescript
// Backend (Node.js example)
import crypto from 'crypto';

function generateSignedUrl(
  filePath: string, 
  userId: string, 
  expiresIn: number = 3600
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const signature = crypto
    .createHmac('sha256', process.env.SECRET_KEY!)
    .update(`${filePath}:${userId}:${expires}`)
    .digest('hex');
  
  return `/api/models/${encodeURIComponent(filePath)}?expires=${expires}&sig=${signature}`;
}

// API endpoint
app.get('/api/models/:path', (req, res) => {
  const { path } = req.params;
  const { expires, sig } = req.query;
  
  // Verify signature and expiration
  const expectedSig = crypto
    .createHmac('sha256', process.env.SECRET_KEY!)
    .update(`${path}:${req.user.id}:${expires}`)
    .digest('hex');
  
  if (sig !== expectedSig || Date.now() / 1000 > Number(expires)) {
    return res.status(403).json({ error: 'Invalid or expired URL' });
  }
  
  // Stream the file
  res.sendFile(getModelPath(path));
});
```

**Frontend usage:**
```typescript
// Request signed URLs from backend
async function getModelUrls(modelId: string): Promise<Record<string, string>> {
  const response = await fetch(`/api/models/${modelId}/urls`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}
```

**Pros:**
- URLs expire automatically
- Can track access per user
- Works with CDNs (CloudFront, etc.)

**Cons:**
- Requires backend
- URLs still visible during validity period

---

### Level 3: Server-Side Authentication

**How it works:**
- All model files served through authenticated API
- Session/token validation on every request
- Files stored outside public directory

```typescript
// Backend (Express.js example)
import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const app = express();
const MODELS_DIR = '/secure/models'; // Outside public directory

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Authorization middleware
const authorizeModel = async (req, res, next) => {
  const { userId, modelId } = req.params;
  
  // Check if user owns or has access to this model
  const hasAccess = await checkModelAccess(req.user.id, userId, modelId);
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};

// Serve model files
app.get(
  '/api/users/:userId/models/:modelId/*',
  authenticate,
  authorizeModel,
  (req, res) => {
    const { userId, modelId } = req.params;
    const filePath = req.params[0]; // Remaining path after modelId
    
    const fullPath = path.join(MODELS_DIR, userId, modelId, filePath);
    
    // Security: Prevent directory traversal
    if (!fullPath.startsWith(path.join(MODELS_DIR, userId, modelId))) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.json': 'application/json',
      '.moc3': 'application/octet-stream',
      '.png': 'image/png',
      '.wav': 'audio/wav',
    };
    
    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    fs.createReadStream(fullPath).pipe(res);
  }
);
```

**Frontend ModelLoader update:**
```typescript
// ModelLoader.ts - Server auth version
class SecureModelLoader {
  private token: string;
  private baseUrl: string;
  
  constructor(token: string, baseUrl = '/api') {
    this.token = token;
    this.baseUrl = baseUrl;
  }
  
  async fetchAsset(userId: string, modelId: string, filePath: string): Promise<Response> {
    const url = `${this.baseUrl}/users/${userId}/models/${modelId}/${filePath}`;
    
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
  }
  
  getAssetUrl(userId: string, modelId: string, filePath: string): string {
    // For images that need direct URLs (textures)
    // You may need to use blob URLs or data URLs
    return `${this.baseUrl}/users/${userId}/models/${modelId}/${filePath}`;
  }
}
```

**Pros:**
- Full access control
- Audit logging possible
- Files never directly accessible

**Cons:**
- Every request goes through server
- Higher latency
- Server load increases

---

### Level 4: Encryption

**How it works:**
- Model files encrypted at rest
- Decryption key provided per-session
- Files decrypted in browser memory

```typescript
// Backend - Encryption service
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

interface EncryptedFile {
  iv: string;
  authTag: string;
  data: string;
}

function encryptFile(buffer: Buffer, key: Buffer): EncryptedFile {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);
  
  return {
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  };
}

// Store encrypted files
async function storeEncryptedModel(userId: string, modelId: string, files: File[]) {
  const modelKey = crypto.randomBytes(32);
  
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const encrypted = encryptFile(buffer, modelKey);
    await saveToStorage(userId, modelId, file.name, encrypted);
  }
  
  // Store key securely (e.g., in database, encrypted with user's key)
  await saveModelKey(userId, modelId, modelKey);
}
```

```typescript
// Frontend - Decryption
class EncryptedModelLoader {
  private decryptionKey: CryptoKey | null = null;
  
  async initializeKey(keyData: ArrayBuffer): Promise<void> {
    this.decryptionKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
  }
  
  async decryptFile(
    encryptedData: ArrayBuffer,
    iv: ArrayBuffer,
    authTag: ArrayBuffer
  ): Promise<ArrayBuffer> {
    if (!this.decryptionKey) {
      throw new Error('Decryption key not initialized');
    }
    
    // Combine encrypted data with auth tag (WebCrypto expects this)
    const combined = new Uint8Array(encryptedData.byteLength + authTag.byteLength);
    combined.set(new Uint8Array(encryptedData), 0);
    combined.set(new Uint8Array(authTag), encryptedData.byteLength);
    
    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.decryptionKey,
      combined
    );
  }
  
  async loadModel(modelUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(modelUrl);
    const { iv, authTag, data } = await response.json();
    
    return this.decryptFile(
      base64ToArrayBuffer(data),
      base64ToArrayBuffer(iv),
      base64ToArrayBuffer(authTag)
    );
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

**Pros:**
- Even if files are accessed, they're unusable without key
- Key can be revoked instantly
- Files safe at rest

**Cons:**
- Significant performance overhead
- Complex implementation
- Decryption happens in browser (key exposure risk)

---

## Recommended Architecture

For a production application with user-uploaded models:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React     │  │  Live2D     │  │   Auth Context      │  │
│  │   App       │──│  Viewer     │──│   (JWT Token)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTPS (authenticated)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     API Gateway                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  - JWT Validation                                    │    │
│  │  - Rate Limiting                                     │    │
│  │  - Request Logging                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
│   Auth      │   │   Model     │   │   File          │
│   Service   │   │   Service   │   │   Service       │
│             │   │             │   │                 │
│ - Login     │   │ - CRUD      │   │ - Signed URLs   │
│ - Register  │   │ - Access    │   │ - Streaming     │
│ - Tokens    │   │   Control   │   │ - Validation    │
└─────────────┘   └──────┬──────┘   └────────┬────────┘
                         │                    │
                         ▼                    ▼
                  ┌─────────────┐     ┌─────────────────┐
                  │  Database   │     │  Object Storage │
                  │  (Postgres) │     │  (S3/GCS)       │
                  │             │     │                 │
                  │ - Users     │     │ - Model files   │
                  │ - Models    │     │ - Encrypted     │
                  │ - Access    │     │ - Private       │
                  └─────────────┘     └─────────────────┘
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Models table
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  encryption_key_id VARCHAR(255), -- Reference to key management service
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model access grants
CREATE TABLE model_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL, -- 'view', 'edit', 'admin'
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(model_id, user_id)
);

-- Access logs for auditing
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Implementation Examples

### Cloud Storage with Signed URLs (AWS S3)

```typescript
// Backend - S3 signed URL generation
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

async function generateModelUrls(
  userId: string,
  modelId: string,
  files: string[]
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  
  for (const file of files) {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `models/${userId}/${modelId}/${file}`,
    });
    
    urls[file] = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });
  }
  
  return urls;
}
```

### CloudFlare Workers (Edge Authentication)

```typescript
// CloudFlare Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Verify JWT
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    try {
      const payload = await verifyJWT(token, env.JWT_SECRET);
      
      // Check access permissions
      const modelPath = url.pathname.replace('/models/', '');
      const [userId, modelId] = modelPath.split('/');
      
      if (payload.sub !== userId) {
        // Check if user has been granted access
        const hasAccess = await checkAccess(env.DB, payload.sub, modelId);
        if (!hasAccess) {
          return new Response('Forbidden', { status: 403 });
        }
      }
      
      // Fetch from R2 storage
      const object = await env.R2_BUCKET.get(modelPath);
      if (!object) {
        return new Response('Not Found', { status: 404 });
      }
      
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (error) {
      return new Response('Invalid token', { status: 401 });
    }
  },
};
```

---

## Summary

| Use Case | Recommended Level |
|----------|------------------|
| Public demo/portfolio | Level 1 (Obfuscation) |
| Freemium app with paid models | Level 2 (Signed URLs) |
| User-uploaded content platform | Level 3 (Server Auth) |
| High-value commercial models | Level 4 (Encryption) |

For most applications, **Level 3 (Server-Side Authentication)** provides the best balance of security and performance. Add **Level 4 (Encryption)** for highly sensitive content where the additional complexity is justified.

---

## Additional Resources

- [AWS S3 Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [Google Cloud Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

