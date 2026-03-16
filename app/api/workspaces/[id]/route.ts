import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkspaceById, getWorkspaceMembership, updateWorkspaceName, updateWorkspaceApiKeys, deleteWorkspace } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getWorkspaceMembership(id, session.userId);
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const workspace = await getWorkspaceById(id);
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      hasApiKeys: !!workspace.anthropic_api_key_enc,
      created_at: workspace.created_at,
    },
    role: membership.role,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getWorkspaceMembership(id, session.userId);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    await updateWorkspaceName(id, name);
  }

  if (body.anthropicApiKey !== undefined || body.replicateApiToken !== undefined) {
    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json({ error: "Only workspace admins can update API keys" }, { status: 403 });
    }
    await updateWorkspaceApiKeys(
      id,
      body.anthropicApiKey || "",
      body.replicateApiToken || ""
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getWorkspaceMembership(id, session.userId);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteWorkspace(id);
  return NextResponse.json({ ok: true });
}
