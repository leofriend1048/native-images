import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "native-images";

// Lazily initialised so the module can be imported at build time without
// env vars present (Vercel build step doesn't inject runtime secrets).
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env vars are not configured.");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Upload a file to the native-images Supabase bucket and return the public URL.
 * @param path  Storage path, e.g. "generated/abc123.jpg"
 * @param body  File contents as a Buffer, Blob, or ArrayBuffer
 * @param contentType  MIME type
 */
export async function uploadToStorage(
  path: string,
  body: Buffer | Blob | ArrayBuffer,
  contentType: string
): Promise<string> {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: true });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Download a URL and re-upload it to Supabase, returning the permanent public URL.
 * Used to persist expiring Replicate delivery URLs.
 */
export async function mirrorUrlToStorage(
  sourceUrl: string,
  path: string
): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${sourceUrl}: ${res.status}`);

  const contentType =
    res.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadToStorage(path, buffer, contentType);
}

/**
 * Upload a data: URI (base64) to Supabase, returning the permanent public URL.
 * Used to persist reference images attached by the user in chat.
 */
export async function uploadDataUrlToStorage(
  dataUrl: string,
  path: string
): Promise<string> {
  const [header, base64] = dataUrl.split(",");
  const contentType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const buffer = Buffer.from(base64, "base64");
  return uploadToStorage(path, buffer, contentType);
}
