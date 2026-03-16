import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getActiveWorkspaceId, getSession } from "@/lib/auth";
import { createInvite, getInvitesByWorkspace, deleteInvite, getWorkspaceMembership, getWorkspaceById } from "@/lib/db";
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

  const invites = await getInvitesByWorkspace(workspaceId);
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, workspaceId: bodyWsId } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    let workspaceId: string | null = null;

    if (bodyWsId && isGlobalAdmin(session)) {
      workspaceId = bodyWsId;
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

    const token = nanoid(32);
    const invite = await createInvite({
      id: nanoid(),
      email: email.toLowerCase().trim(),
      token,
      workspace_id: workspaceId,
    });

    return NextResponse.json({ invite });
  } catch (err) {
    console.error("Create invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wsId = await getActiveWorkspaceId();
  if (!wsId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 400 });
  }

  const membership = await getWorkspaceMembership(wsId, session.userId);
  const isWsAdmin = membership ? isWorkspaceAdmin({ session, workspaceId: wsId, role: membership.role }) : false;

  if (!isGlobalAdmin(session) && !isWsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await deleteInvite(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
