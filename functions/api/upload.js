// functions/api/upload.js

/* === HANDLER === */

export async function onRequestPut({ request, env }) {
  const authHeader = request.headers.get("X-Custom-Auth");

  // In production, set this via `npx wrangler pages secret put UPLOAD_SECRET`
  // For now, we hardcode a fallback for testing
  const CORRECT_PIN = env.UPLOAD_SECRET || "1234";

  if (authHeader !== CORRECT_PIN) {
    return new Response("Unauthorized: Wrong PIN", { status: 401 });
  }

  const url = new URL(request.url);
  const filename = url.searchParams.get("filename");
  const type = request.headers.get("Content-Type");

  if (!filename) return new Response("Missing filename", { status: 400 });

  try {
    await env.BUCKET.put(filename, request.body, {
      httpMetadata: { contentType: type },
    });

    return new Response(JSON.stringify({ success: true, key: filename }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(`Upload Failed: ${err.message}`, { status: 500 });
  }
}
