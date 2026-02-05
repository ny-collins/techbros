// functions/api/upload-init.js
// Initiates a multipart upload session

const ALLOWED_MIME_TYPES = [
    'application/pdf', 'text/plain', 'text/markdown', 'text/html',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm', 'video/ogg',
    'application/zip', 'application/x-zip-compressed'
];

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
    
    if (!contentLength || contentLength < 1) {
        return { valid: false, error: 'File size required' };
    }
    
    // R2 multipart minimum is 5MB per part (except last), max file is 5TB
    // We'll support up to 1GB for now as reasonable limit
    const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
    if (contentLength > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size exceeds limit (1GB max)' };
    }
    
    return { valid: true };
}

export async function onRequestPost({ request, env }) {
    try {
        // Auth check
        const authHeader = request.headers.get("X-Custom-Auth");
        const CORRECT_PIN = env.UPLOAD_SECRET || "1234";
        
        if (authHeader !== CORRECT_PIN) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { 
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Parse request body
        const { filename, contentType, contentLength } = await request.json();
        
        // Validate
        const validation = validateFile(filename, contentType, contentLength);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Create multipart upload using R2's native API
        const multipartUpload = await env.BUCKET.createMultipartUpload(filename, {
            httpMetadata: {
                contentType: contentType,
                cacheControl: "public, max-age=31536000"
            }
        });
        
        return new Response(JSON.stringify({
            uploadId: multipartUpload.uploadId,
            key: multipartUpload.key
        }), {
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('Upload init failed:', err);
        return new Response(JSON.stringify({ error: 'Failed to initialize upload' }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
