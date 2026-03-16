import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, getImpersonatorSessionFromRequest, signToken, startImpersonation, stopImpersonation } from "@/lib/auth";
import { getUserById } from "@/lib/db";

function isGlobalAdmin(session: { email: string; isAdmin: boolean }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return adminEmail ? session.email === adminEmail : session.isAdmin;
}

// POST — start impersonation
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !isGlobalAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Prevent impersonating yourself
  if (userId === session.userId) {
    return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Create a session token for the target user
  const targetToken = await signToken({
    userId: targetUser.id,
    email: targetUser.email,
    isAdmin: targetUser.is_admin === 1,
  });

  // Get admin's current session token to preserve
  const adminToken = req.cookies.get("session")?.value;
  if (!adminToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  await startImpersonation(targetToken, adminToken);

  return NextResponse.json({ success: true, email: targetUser.email });
}

// DELETE — stop impersonation
export async function DELETE(req: NextRequest) {
  const impersonator = await getImpersonatorSessionFromRequest(req);
  if (!impersonator) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

  await stopImpersonation();

  return NextResponse.json({ success: true });
}
