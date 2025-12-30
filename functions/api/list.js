// functions/api/list.js

/* === HANDLER === */

export async function onRequestGet({ env }) {
  try {
    const list = await env.BUCKET.list();

    const resources = list.objects.map(item => {
      return {
        id: item.key,
        title: item.key.split('.')[0].replace(/_/g, ' '),
        type: determineType(item.key),
        url: `/cdn/${item.key}`,
        size: item.size,
        date: item.uploaded,
        isCloud: true
      };
    });

    return new Response(JSON.stringify(resources), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response("Error fetching list", { status: 500 });
  }
}

/* === UTILITIES === */

function determineType(filename) {
  if (filename.endsWith('.pdf')) return 'pdf';
  if (filename.match(/\.(mp3|wav|ogg)$/)) return 'audio';
  if (filename.match(/\.(mp4|webm|ogv)$/)) return 'video';
  if (filename.match(/\.(jpg|png|webp|jpeg|gif|svg)$/)) return 'image';
  if (filename.match(/\.(zip|rar|7z|tar|gz)$/)) return 'archive';
  if (filename.match(/\.(txt|md|html|css|js|json)$/)) return 'text';
  if (filename.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) return 'document';
  return 'unknown';
}
