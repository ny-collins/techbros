// functions/api/upload.js

/* === CONSTANTS === */

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_MIME_TYPES = [
    'application/pdf', 'text/plain', 'text/markdown', 'text/html',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm', 'video/ogg',
    'application/zip', 'application/x-zip-compressed'
];
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_UPLOADS = 10;

/* === RATE LIMITING === */

const rateLimitMap = new Map();

function isRateLimited(clientIP) {
    const now = Date.now();
    const clientData = rateLimitMap.get(clientIP) || { count: 0, windowStart: now };
    
    if (now - clientData.windowStart > RATE_LIMIT_WINDOW) {
        clientData.count = 0;
        clientData.windowStart = now;
    }
    
    clientData.count++;
    rateLimitMap.set(clientIP, clientData);
    
    return clientData.count > RATE_LIMIT_MAX_UPLOADS;
}

/* === VALIDATION === */

function validateFile(filename, contentType, contentLength) {
    if (!filename || filename.length > 255) {
        return { valid: false, error: 'Invalid filename' };
    }
    
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return { valid: false, error: 'Filename contains invalid characters' };
    }
    
    if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
        return { valid: false, error: 'File type not allowed' };
    }
    
    if (!contentLength || contentLength > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size exceeds limit (500MB max)' };
    }
    
    return { valid: true };
}

/* === HANDLER === */

export async function onRequestPut({ request, env }) {
  const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  
  if (isRateLimited(clientIP)) {
    return new Response("Rate limit exceeded. Try again later.", { status: 429 });
  }

  const authHeader = request.headers.get("X-Custom-Auth");
  const CORRECT_PIN = env.UPLOAD_SECRET || "1234";

  if (authHeader !== CORRECT_PIN) {
    return new Response("Unauthorized: Wrong PIN", { status: 401 });
  }

  const url = new URL(request.url);
  const filename = url.searchParams.get("filename");
  const contentType = request.headers.get("Content-Type");
  const contentLength = parseInt(request.headers.get("Content-Length") || "0");

  const validation = validateFile(filename, contentType, contentLength);
  if (!validation.valid) {
    return new Response(validation.error, { status: 400 });
  }

  try {
    await env.BUCKET.put(filename, request.body, {
      httpMetadata: { 
        contentType: contentType,
        cacheControl: "public, max-age=31536000"
      },
    });

    return new Response(JSON.stringify({ success: true, key: filename }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`Upload failed for ${filename}:`, err);
    return new Response("Upload failed. Please try again.", { status: 500 });
  }
}
