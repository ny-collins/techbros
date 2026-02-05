// functions/api/upload-part.js
// Uploads a single part of a multipart upload

export async function onRequestPut({ request, env }) {
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
        
        // Parse query params
        const url = new URL(request.url);
        const key = url.searchParams.get('key');
        const uploadId = url.searchParams.get('uploadId');
        const partNumber = parseInt(url.searchParams.get('partNumber'));
        
        if (!key || !uploadId || !partNumber || partNumber < 1 || partNumber > 10000) {
            return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Get the multipart upload object
        const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
        
        // Upload this part - R2 will handle the streaming
        const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);
        
        return new Response(JSON.stringify({
            partNumber: uploadedPart.partNumber,
            etag: uploadedPart.etag
        }), {
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('Part upload failed:', err);
        return new Response(JSON.stringify({ 
            error: 'Failed to upload part',
            details: err.message 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
