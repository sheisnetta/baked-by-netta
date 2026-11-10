import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const store = getStore("baked-by-netta-reviews");
    const { blobs } = await store.list({ prefix: "review-" });
    const reviews = [];

    for (const blob of blobs) {
      const item = await store.get(blob.key, { type: "json" });
      if (item) reviews.push(item);
    }

    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return Response.json(
      { reviews },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { reviews: [], error: "Reviews are temporarily unavailable." },
      { status: 503 }
    );
  }
};
