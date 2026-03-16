import Replicate from "replicate";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { mirrorUrlToStorage } from "@/lib/storage";
import {
  getGeneratedImagesByIds,
  insertGeneratedImage,
  getWorkspaceApiKeys,
} from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export const maxDuration = 120;

const MODEL_ID = "google/nano-banana-pro" as const;

export async function POST(req: Request) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageId, aspectRatio } = (await req.json()) as {
    imageId: string;
    aspectRatio: string;
  };

  if (!imageId || !aspectRatio) {
    return NextResponse.json({ error: "imageId and aspectRatio are required" }, { status: 400 });
  }

  // Look up original image
  const [image] = await getGeneratedImagesByIds([imageId]);
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Verify user owns the image or is in the same workspace
  if (image.user_id !== ctx.session.userId && image.workspace_id !== ctx.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get workspace API keys
  const keys = await getWorkspaceApiKeys(ctx.workspaceId);
  if (!keys?.replicateApiToken) {
    return NextResponse.json({ error: "Replicate API key not configured" }, { status: 400 });
  }

  const replicate = new Replicate({ auth: keys.replicateApiToken });

  // Always use Nano Banana Pro with the original image as reference.
  // The prompt tells the model to recreate the exact same scene at the new aspect ratio.
  const input = {
    prompt: `Recreate this exact image at a ${aspectRatio} aspect ratio. Keep everything identical — same subject, composition, lighting, colors, mood, and style. Only adjust the framing/crop to fit the new aspect ratio. Original prompt: ${image.prompt}`,
    image_input: [image.url],
    aspect_ratio: aspectRatio,
    resolution: "2K",
    output_format: "jpg",
    safety_filter_level: "block_only_high",
  };

  try {
    const output = await replicate.run(MODEL_ID, { input });

    const replicateUrl = typeof output === "string"
      ? output
      : Array.isArray(output)
        ? (output as string[])[0]
        : String(output);

    // Mirror to Supabase
    const storagePath = `generated/${ctx.session.userId}/${Date.now()}-resize.jpg`;
    let finalUrl = replicateUrl;
    try {
      finalUrl = await mirrorUrlToStorage(replicateUrl, storagePath);
    } catch (err) {
      console.error("Failed to mirror resized image:", err);
    }

    // Save to DB
    const newId = nanoid();
    await insertGeneratedImage({
      id: newId,
      user_id: ctx.session.userId,
      chat_id: image.chat_id,
      workspace_id: ctx.workspaceId,
      url: finalUrl,
      prompt: image.prompt,
      model: MODEL_ID,
      aspect_ratio: aspectRatio,
    });

    return NextResponse.json({
      success: true,
      image: {
        id: newId,
        url: finalUrl,
        prompt: image.prompt,
        model: MODEL_ID,
        aspect_ratio: aspectRatio,
        chat_id: image.chat_id,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Resize error [${MODEL_ID}]:`, message);
    return NextResponse.json({ error: message || "Resize failed" }, { status: 500 });
  }
}
