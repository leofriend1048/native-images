import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { getUserById, updateUserPassword, updateUserName } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, name } = await req.json();

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentPassword && newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await updateUserPassword(user.id, hash);
    }

    if (name !== undefined) {
      await updateUserName(user.id, name.trim());
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
