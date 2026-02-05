// functions/api/upload-complete.js
// Completes a multipart upload

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
        const { key, uploadId, parts } = await request.json();
        
        if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Validate parts structure
        for (const part of parts) {
            if (!part.partNumber || !part.etag || part.partNumber < 1) {
                return new Response(JSON.stringify({ error: 'Invalid part data' }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }
        
        // Get the multipart upload object
        const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
        
        // Complete the multipart upload
        const object = await multipartUpload.complete(parts);
        
        return new Response(JSON.stringify({
            success: true,
            key: object.key,
            size: object.size,
            etag: object.etag
        }), {
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('Complete upload failed:', err);
        return new Response(JSON.stringify({ 
            error: 'Failed to complete upload',
            details: err.message 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
