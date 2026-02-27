import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/invite",
  "/api/auth/login",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow all other API routes to handle their own auth
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin/") && pathname !== "/api/generate") {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin/")) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || session.email !== adminEmail) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/chat", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
