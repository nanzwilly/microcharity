// Vercel Blob upload helpers — shared by the donation-screenshot route and the
// cause-application route so file handling looks the same in both places.
//
// All uploads use `addRandomSuffix: true` so the resulting public URL is
// unguessable. The URL is the only way to fetch the file; nobody can enumerate
// or guess sibling files in the same "folder".

import { put, type PutBlobResult } from "@vercel/blob";

export type UploadResult = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
};

export type UploadInput = {
  file: File;
  /** Path prefix in the bucket. e.g. "donations/<donationId>" or "applications/<appNo>". */
  pathPrefix: string;
  /** Logical slot name used to disambiguate multiple files for the same record (e.g. "screenshot", "photo"). */
  slot: string;
};

// Reasonable upper bounds. Anything above is rejected before the upload starts —
// keeps a bad client from burning network on a multi-GB file.
export const MAX_BYTES_PER_FILE = 8 * 1024 * 1024;            // 8 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export function isAcceptableType(mime: string | undefined): boolean {
  return !!mime && ALLOWED_MIME.has(mime);
}

/**
 * Upload a single File to Vercel Blob under the given prefix. Returns the
 * public URL plus the metadata we mirror onto the DB row.
 *
 * Throws on invalid type / size or when the underlying Blob call fails — caller
 * decides whether to surface the error or swallow it.
 */
export async function uploadToBlob(input: UploadInput): Promise<UploadResult> {
  if (input.file.size > MAX_BYTES_PER_FILE) {
    throw new Error(`File exceeds the ${(MAX_BYTES_PER_FILE / 1024 / 1024).toFixed(0)} MB limit.`);
  }
  if (input.file.type && !isAcceptableType(input.file.type)) {
    throw new Error(`File type ${input.file.type} is not allowed (JPG, PNG, WebP, HEIC, or PDF only).`);
  }

  // File name in Blob: prefix + slot + extension. addRandomSuffix appends an
  // unguessable token so the actual URL is something like
  // "donations/abc123/screenshot-x9k7n2.jpg".
  const ext = extOf(input.file.name) || extFromMime(input.file.type);
  const key = `${input.pathPrefix}/${input.slot}${ext}`;

  const blob: PutBlobResult = await put(key, input.file, {
    access: "public",
    contentType: input.file.type || "application/octet-stream",
    addRandomSuffix: true,
  });

  return {
    url: blob.url,
    filename: input.file.name,
    size: input.file.size,
    mimeType: input.file.type || "application/octet-stream",
  };
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  const e = name.slice(i).toLowerCase();
  return /^\.[a-z0-9]{1,6}$/.test(e) ? e : "";
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png":  return ".png";
    case "image/webp": return ".webp";
    case "image/heic": return ".heic";
    case "image/heif": return ".heif";
    case "application/pdf": return ".pdf";
    default: return "";
  }
}
