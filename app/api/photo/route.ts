const KEY = process.env.GOOGLE_MAPS_SERVER_KEY!;

export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");

  if (!ref || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(ref)) {
    return new Response("Bad photo reference", { status: 400 });
  }

  const url =
    `https://places.googleapis.com/v1/${ref}/media` +
    `?maxWidthPx=600&key=${KEY}`;

  const upstream = await fetch(url);

  if (!upstream.ok) {
    return new Response("Photo unavailable", { status: 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}