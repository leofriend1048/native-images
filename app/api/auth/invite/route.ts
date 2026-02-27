import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getInviteByToken, markInviteUsed, createUser, getUserByEmail } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();

    if (!token || !name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const invite = await getInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
    }

    if (invite.used) {
      return NextResponse.json({ error: "Invite has already been used" }, { status: 400 });
    }

    const existing = await getUserByEmail(invite.email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "Account already exists for this email" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await createUser({
      id: nanoid(),
      email: invite.email.toLowerCase(),
      name: name.trim(),
      password_hash: hash,
      is_admin: 0,
    });

    await markInviteUsed(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Invite claim error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
