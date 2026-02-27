import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/auth";
import { createInvite, getAllInvites, deleteInvite } from "@/lib/db";

function isAdmin(session: { email: string; isAdmin: boolean }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return adminEmail ? session.email === adminEmail : session.isAdmin;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await getAllInvites();
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const token = nanoid(32);
    const invite = await createInvite({
      id: nanoid(),
      email: email.toLowerCase().trim(),
      token,
    });

    return NextResponse.json({ invite });
  } catch (err) {
    console.error("Create invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    await deleteInvite(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
