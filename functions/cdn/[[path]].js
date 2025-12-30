// functions/cdn/[[path]].js
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  // Extract filename from /cdn/my-file.pdf
  const filename = url.pathname.replace('/cdn/', '');

  const object = await env.BUCKET.get(filename);

  if (object === null) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000'); // Cache forever

  return new Response(object.body, { headers });
}
