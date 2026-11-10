import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key || !/^photo-[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(key)) {
    return new Response("Invalid photo", { status: 400 });
  }

  try {
    const photo = await getStore("baked-by-netta-review-photos")
      .get(key, { type: "blob" });

    if (!photo) {
      return new Response("Photo not found", { status: 404 });
    }

    const extension = key.split(".").pop().toLowerCase();
    const types = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif"
    };

    return new Response(photo, {
      headers: {
        "Content-Type": types[extension],
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new Response("Unable to load photo", { status: 500 });
  }
};
