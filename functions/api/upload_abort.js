// functions/api/upload-abort.js
// Aborts a multipart upload to clean up partial data

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
        const { key, uploadId } = await request.json();
        
        if (!key || !uploadId) {
            return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Get the multipart upload object
        const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
        
        // Abort the upload
        await multipartUpload.abort();
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Upload aborted'
        }), {
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (err) {
        console.error('Abort upload failed:', err);
        return new Response(JSON.stringify({ 
            error: 'Failed to abort upload',
            details: err.message 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
