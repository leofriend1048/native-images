import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getUserByEmail, createUser, createWorkspace, getWorkspaceBySlug, addWorkspaceMember, updateUserDefaultWorkspace } from "@/lib/db";
import { signToken, setSessionCookie, setActiveWorkspaceCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, workspaceName, anthropicApiKey, replicateApiToken } = await req.json();

    if (!email || !password || !name || !workspaceName) {
      return NextResponse.json(
        { error: "Email, password, name, and workspace name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!anthropicApiKey?.trim() || !replicateApiToken?.trim()) {
      return NextResponse.json(
        { error: "API keys are required to create a workspace" },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Create user
    const hash = await bcrypt.hash(password, 12);
    const user = await createUser({
      id: nanoid(),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password_hash: hash,
      is_admin: 0,
    });

    // Create workspace with unique slug
    let slug = workspaceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || nanoid(8);
    const existingSlug = await getWorkspaceBySlug(slug);
    if (existingSlug) {
      slug = `${slug}-${nanoid(4)}`;
    }
    const workspace = await createWorkspace(
      workspaceName.trim(),
      slug,
      user.id,
      anthropicApiKey.trim(),
      replicateApiToken.trim()
    );

    // Add user as owner
    await addWorkspaceMember(workspace.id, user.id, "owner");
    await updateUserDefaultWorkspace(user.id, workspace.id);

    // Auto-login
    const token = await signToken({
      userId: user.id,
      email: user.email,
      isAdmin: false,
    });
    await setSessionCookie(token);
    await setActiveWorkspaceCookie(workspace.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "A workspace with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
