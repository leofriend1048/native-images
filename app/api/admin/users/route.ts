import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllUsers, deleteUser, getUserById } from "@/lib/db";

function isAdmin(session: { email: string; isAdmin: boolean }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return adminEmail ? session.email === adminEmail : session.isAdmin;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Prevent deleting self
    if (id === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting the admin
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
