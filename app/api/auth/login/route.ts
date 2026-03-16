import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, logUserLogin, getWorkspacesByUserId, getWorkspaceById, MTB_WORKSPACE_ID } from "@/lib/db";
import { signToken, setSessionCookie, setActiveWorkspaceCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = adminEmail ? user.email === adminEmail : user.is_admin === 1;

    const token = await signToken({
      userId: user.id,
      email: user.email,
      isAdmin,
    });

    await setSessionCookie(token);

    // Set active workspace cookie and determine slug for redirect
    let activeWsId = user.default_workspace_id;
    if (!activeWsId) {
      const workspaces = await getWorkspacesByUserId(user.id);
      activeWsId = workspaces[0]?.id || MTB_WORKSPACE_ID;
    }
    await setActiveWorkspaceCookie(activeWsId);

    const activeWs = await getWorkspaceById(activeWsId);
    const workspaceSlug = activeWs?.slug || "chat";

    await logUserLogin(user.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, isAdmin },
      workspaceSlug,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
