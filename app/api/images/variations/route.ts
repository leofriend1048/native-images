import Replicate from "replicate";
import { nanoid } from "nanoid";
import { getGeneratedImagesByIds, insertGeneratedImage, getWorkspaceApiKeys } from "@/lib/db";
import { mirrorUrlToStorage } from "@/lib/storage";
import { requireWorkspaceAccess } from "@/lib/workspace";

export const maxDuration = 300;

export async function POST(req: Request) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { session, workspaceId } = ctx;

  const keys = await getWorkspaceApiKeys(workspaceId);
  if (!keys.replicateApiToken) {
    return new Response(JSON.stringify({ error: "Replicate API key not configured" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { imageId, count = 4 } = await req.json();
  if (!imageId) {
    return new Response(JSON.stringify({ error: "imageId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [original] = await getGeneratedImagesByIds([imageId]);
  if (!original) {
    return new Response(JSON.stringify({ error: "Image not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const replicate = new Replicate({ auth: keys.replicateApiToken });
  const batchCount = Math.min(Math.max(count, 1), 6);

  try {
    // Generate variations using same prompt + original as reference
    const input: Record<string, unknown> = {
      prompt: original.prompt,
      aspect_ratio: original.aspect_ratio || "4:5",
      resolution: "2K",
      output_format: "jpg",
      safety_filter_level: "block_only_high",
      image_input: [original.url],
    };

    const runs = Array.from({ length: batchCount }, () =>
      replicate.run("google/nano-banana-pro" as `${string}/${string}`, { input })
    );
    const outputs = await Promise.all(runs);

    const replicateUrls = outputs.map((output) =>
      Array.isArray(output) ? (output as string[])[0] : typeof output === "string" ? output : String(output)
    );

    // Mirror to Supabase
    const mirroredUrls = await Promise.all(
      replicateUrls.map(async (url, idx) => {
        const storagePath = `generated/${session.userId}/${Date.now()}-var-${idx}.jpg`;
        try {
          return await mirrorUrlToStorage(url, storagePath);
        } catch {
          return url;
        }
      })
    );

    // Persist to DB
    const newImages = await Promise.all(
      mirroredUrls.map(async (url) => {
        const id = nanoid();
        await insertGeneratedImage({
          id,
          user_id: session.userId,
          chat_id: original.chat_id,
          workspace_id: workspaceId,
          url,
          prompt: original.prompt,
          model: "google/nano-banana-pro",
          aspect_ratio: original.aspect_ratio,
        }).catch((err) => console.error("Failed to persist variation:", err));
        return {
          id,
          url,
          prompt: original.prompt,
          model: "google/nano-banana-pro",
          aspect_ratio: original.aspect_ratio,
          chat_id: original.chat_id,
          created_at: new Date().toISOString(),
        };
      })
    );

    return new Response(JSON.stringify({ images: newImages }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Variations error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
