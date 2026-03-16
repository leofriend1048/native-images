import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getInviteByToken, markInviteUsed, createUser, getUserByEmail, addWorkspaceMember, updateUserDefaultWorkspace, getWorkspaceById, MTB_WORKSPACE_ID } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  let workspaceName: string | null = null;
  const wsId = invite.workspace_id || MTB_WORKSPACE_ID;
  const ws = await getWorkspaceById(wsId);
  if (ws) workspaceName = ws.name;

  return NextResponse.json({
    email: invite.email,
    used: !!invite.used,
    workspaceName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invite = await getInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
    }

    if (invite.used) {
      return NextResponse.json({ error: "Invite has already been used" }, { status: 400 });
    }

    // Determine workspace from invite (fall back to MTB)
    const workspaceId = invite.workspace_id || MTB_WORKSPACE_ID;

    const existing = await getUserByEmail(invite.email.toLowerCase());

    if (existing) {
      // User already has an account — just add them to the workspace
      await addWorkspaceMember(workspaceId, existing.id, "member").catch(() => {});
      await markInviteUsed(token);

      return NextResponse.json({
        user: { id: existing.id, email: existing.email, name: existing.name },
        existingAccount: true,
      });
    }

    // New account — validate registration fields
    if (!name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await createUser({
      id: nanoid(),
      email: invite.email.toLowerCase(),
      name: name.trim(),
      password_hash: hash,
      is_admin: 0,
      default_workspace_id: workspaceId,
    });

    // Add to workspace
    await addWorkspaceMember(workspaceId, user.id, "member").catch(() => {});
    await updateUserDefaultWorkspace(user.id, workspaceId);

    await markInviteUsed(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Invite claim error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
