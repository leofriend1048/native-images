import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = adminEmail ? user.email === adminEmail : user.is_admin === 1;

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, isAdmin },
  });
}
