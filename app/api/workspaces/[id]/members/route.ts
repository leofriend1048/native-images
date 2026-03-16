import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getWorkspaceMembership,
  getWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  getUserByEmail,
  updateMemberRole,
} from "@/lib/db";

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

  const members = await getWorkspaceMembers(id);
  return NextResponse.json({ members });
}

export async function POST(
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

  const { email, role = "member" } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await getUserByEmail(email.toLowerCase().trim());
  if (!user) {
    return NextResponse.json({ error: "User not found — they must register first" }, { status: 404 });
  }

  try {
    await addWorkspaceMember(id, user.id, role);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE constraint")) {
      // Already a member — update their role instead
      await updateMemberRole(id, user.id, role);
      return NextResponse.json({ ok: true, updated: true });
    }
    console.error("Add member error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Can't remove the owner
  const targetMembership = await getWorkspaceMembership(id, userId);
  if (targetMembership?.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 400 });
  }

  await removeWorkspaceMember(id, userId);
  return NextResponse.json({ ok: true });
}
