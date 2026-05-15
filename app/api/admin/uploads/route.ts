import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getBlobToken() {
  const directToken =
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN?.trim();

  if (directToken) {
    return directToken;
  }

  const fallbackToken = Object.entries(process.env).find(
    ([key, value]) => key.endsWith("BLOB_READ_WRITE_TOKEN") && value?.trim(),
  )?.[1];

  return fallbackToken?.trim() ?? "";
}

function uploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/token|unauthorized|forbidden|403|401/i.test(message)) {
    return "Vercel Blob rejected the upload. Check that BLOB_READ_WRITE_TOKEN is set for Production and redeploy.";
  }

  if (/store|not found|404/i.test(message)) {
    return "Vercel Blob store was not found. Reconnect the Blob store to this Vercel project and redeploy.";
  }

  return "Vercel Blob upload failed. Check the project Blob storage setup and redeploy.";
}

function safePathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose an image to upload." }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Upload a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Please upload an image under 2 MB." },
      { status: 413 },
    );
  }

  const token = getBlobToken();

  if (!token) {
    return NextResponse.json(
      { error: "Image storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel and redeploy." },
      { status: 500 },
    );
  }

  const slug = safePathPart(String(formData?.get("slug") ?? "")) || "event";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const pathname = `events/${timestamp}-${slug}.webp`;

  let blob;

  try {
    blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      token,
    });
  } catch (error) {
    console.error("event image upload failed", error);
    return NextResponse.json(
      { error: uploadErrorMessage(error) },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: blob.url,
    size: file.size,
  });
}
