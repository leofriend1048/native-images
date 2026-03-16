import { NextResponse } from "next/server";
import { getSession, setActiveWorkspaceCookie } from "@/lib/auth";
import { getWorkspaceMembership, updateUserDefaultWorkspace } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await req.json();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  // Verify membership
  const membership = await getWorkspaceMembership(workspaceId, session.userId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  await setActiveWorkspaceCookie(workspaceId);
  await updateUserDefaultWorkspace(session.userId, workspaceId);

  return NextResponse.json({ ok: true });
}
