import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkspacesByUserId, createWorkspace, addWorkspaceMember } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await getWorkspacesByUserId(session.userId);
  // Strip encrypted keys from response
  const safe = workspaces.map(({ anthropic_api_key_enc, replicate_api_token_enc, encryption_iv, ...rest }) => ({
    ...rest,
    hasApiKeys: !!anthropic_api_key_enc,
  }));
  return NextResponse.json({ workspaces: safe });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, anthropicApiKey, replicateApiToken } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  // Generate slug from name
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) {
    return NextResponse.json({ error: "Invalid workspace name" }, { status: 400 });
  }

  try {
    const workspace = await createWorkspace(
      name.trim(),
      slug,
      session.userId,
      anthropicApiKey,
      replicateApiToken
    );

    // Creator becomes the owner
    await addWorkspaceMember(workspace.id, session.userId, "owner");

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        created_at: workspace.created_at,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "A workspace with this name already exists" }, { status: 409 });
    }
    console.error("Create workspace error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
