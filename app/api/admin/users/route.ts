import { NextRequest, NextResponse } from "next/server";
import { getActiveWorkspaceId, getSession } from "@/lib/auth";
import { getUsersWithStatsByWorkspace, deleteUser, getUserById, getWorkspaceMembership, getWorkspaceById } from "@/lib/db";
import { isWorkspaceAdmin } from "@/lib/workspace";

function isGlobalAdmin(session: { email: string; isAdmin: boolean }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return adminEmail ? session.email === adminEmail : session.isAdmin;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Global admins can specify a workspaceId query param to view any workspace
  const queryWsId = req.nextUrl.searchParams.get("workspaceId");
  let workspaceId: string | null = null;

  if (queryWsId && isGlobalAdmin(session)) {
    const ws = await getWorkspaceById(queryWsId);
    if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    workspaceId = queryWsId;
  } else {
    workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }

    const membership = await getWorkspaceMembership(workspaceId, session.userId);
    const isWsAdmin = membership ? isWorkspaceAdmin({ session, workspaceId, role: membership.role }) : false;

    if (!isGlobalAdmin(session) && !isWsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const users = await getUsersWithStatsByWorkspace(workspaceId);
  return NextResponse.json({ users });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !isGlobalAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (id === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email === adminEmail) {
      return NextResponse.json({ error: "Cannot delete the admin account" }, { status: 400 });
    }

    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
