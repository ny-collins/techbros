// functions/api/list.js

/* === HANDLER === */

export async function onRequestGet({ env }) {
  try {
    const list = await env.BUCKET.list();
    const objects = list.objects;

    // DEBUG: Log matches
    console.log("R2 Objects Sample:", objects.slice(0, 5).map(o => o.key));

    // Create a set of cover image keys for fast lookup
    const covers = new Set(objects.filter(o => o.key.endsWith('.cover.jpg')).map(o => o.key));

    const resources = objects
      .filter(item => !item.key.endsWith('.cover.jpg')) // Don't list covers as standalone resources
      .map(item => {
        const coverKey = `${item.key}.cover.jpg`;
        if (covers.has(coverKey)) console.log(`Matched cover for: ${item.key}`);
        else if (item.key.endsWith('.mp3')) console.log(`Missed cover for: ${item.key} (Expected: ${coverKey})`);
        
        return {
          id: item.key,
          title: item.key.split('.')[0].replace(/_/g, ' '),
          type: determineType(item.key),
          url: `/cdn/${item.key}`,
          cover: covers.has(coverKey) ? `/cdn/${coverKey}` : null,
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
