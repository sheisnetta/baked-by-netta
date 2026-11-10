import { getStore } from "@netlify/blobs";
import { randomUUID, createHash } from "node:crypto";

const reply = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

export default async (request, context) => {
  if (request.method !== "POST") {
    return reply({ error: "Method not allowed." }, 405);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return reply({ error: "Invalid submission." }, 400);
  }

  if (typeof data.website === "string" && data.website.trim()) {
    return reply({ ok: true });
  }

  const name = String(data.name || "").trim().slice(0, 80);
  const review = String(data.review || "").trim().slice(0, 1500);
  const rating = Number(data.rating);

  if (!name || !review || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return reply({
      error: "Please enter your name, review, and a 1–5 star rating."
    }, 400);
  }

  const reviewsStore = getStore("baked-by-netta-reviews");
  const spamStore = getStore("baked-by-netta-review-spam");

  const ip = context.ip ||
    request.headers.get("x-nf-client-connection-ip") ||
    "unknown";

  const ipKey = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  const rateKey = `rate-${ipKey}`;

  const prior = await spamStore.get(rateKey, { type: "json" }).catch(() => null);
  const recent = Array.isArray(prior?.timestamps)
    ? prior.timestamps.filter(t => now - t < 60 * 60 * 1000)
    : [];

  if (recent.length >= 5) {
    return reply({
      error: "Please wait a little while before submitting another review."
    }, 429);
  }

  recent.push(now);
  await spamStore.setJSON(
    rateKey,
    { timestamps: recent },
    { expirationTtl: 3600 }
  );

  let photoUrl = null;

  if (data.photoData) {
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ]);

    if (!allowed.has(data.photoType)) {
      return reply({
        error: "Please upload a JPG, PNG, WEBP, or GIF photo."
      }, 400);
    }

    const buffer = Buffer.from(String(data.photoData), "base64");

    if (!buffer.length || buffer.length > 3 * 1024 * 1024) {
      return reply({
        error: "Please choose a photo smaller than 3 MB."
      }, 400);
    }

    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    }[data.photoType];

    const photoKey = `photo-${randomUUID()}.${ext}`;

    await getStore("baked-by-netta-review-photos").set(
      photoKey,
      buffer,
      { metadata: { contentType: data.photoType } }
    );

    photoUrl = `/.netlify/functions/review-photo?key=${encodeURIComponent(photoKey)}`;
  }

  const item = {
    id: randomUUID(),
    name,
    rating,
    review,
    photoUrl,
    createdAt: new Date().toISOString()
  };

  await reviewsStore.setJSON(`review-${item.id}.json`, item);

  return reply({ ok: true, review: item }, 201);
};
