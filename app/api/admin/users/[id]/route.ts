import { NextResponse } from "next/server";
import { getActiveWorkspaceId, getSession } from "@/lib/auth";
import {
  getUserById,
  getUsersWithStatsByWorkspace,
  getGeneratedImagesByUserAndWorkspace,
  getDecksByUserAndWorkspace,
  getGeneratedImagesByIds,
  getWorkspaceMembership,
  getWorkspaceById,
} from "@/lib/db";
import { isWorkspaceAdmin } from "@/lib/workspace";

function isGlobalAdmin(session: { email: string; isAdmin: boolean }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return adminEmail ? session.email === adminEmail : session.isAdmin;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const queryWsId = url.searchParams.get("workspaceId");
  let workspaceId: string | null = null;

  if (queryWsId && isGlobalAdmin(session)) {
    const ws = await getWorkspaceById(queryWsId);
    if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    workspaceId = queryWsId;
  } else {
    workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }

    const membership = await getWorkspaceMembership(workspaceId, session.userId);
    const isWsAdmin = membership ? isWorkspaceAdmin({ session, workspaceId, role: membership.role }) : false;

    if (!isGlobalAdmin(session) && !isWsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [allWithStats, images, decks] = await Promise.all([
    getUsersWithStatsByWorkspace(workspaceId),
    getGeneratedImagesByUserAndWorkspace(id, workspaceId),
    getDecksByUserAndWorkspace(id, workspaceId),
  ]);

  const stats = allWithStats.find((u) => u.id === id);
  if (!stats) {
    return NextResponse.json({ error: "User stats not found" }, { status: 500 });
  }

  // Enrich decks with thumbnails
  const deckImageIds = decks.flatMap((d) => {
    try {
      return (JSON.parse(d.image_ids) as string[]).slice(0, 4);
    } catch {
      return [];
    }
  });
  const uniqueIds = [...new Set(deckImageIds)];
  const deckImages = uniqueIds.length > 0 ? await getGeneratedImagesByIds(uniqueIds) : [];
  const imageMap = new Map(deckImages.map((img) => [img.id, img.url]));

  const decksWithThumbs = decks.map((deck) => {
    const ids: string[] = (() => {
      try {
        return JSON.parse(deck.image_ids) as string[];
      } catch {
        return [];
      }
    })();
    return {
      ...deck,
      thumbnails: ids.slice(0, 4).map((i) => imageMap.get(i)).filter((u): u is string => !!u),
    };
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      created_at: user.created_at,
    },
    stats: {
      login_count: stats.login_count,
      last_login: stats.last_login,
      last_active: stats.last_active,
      image_count: stats.image_count,
      chat_count: stats.chat_count,
      deck_count: stats.deck_count,
    },
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      prompt: img.prompt,
      model: img.model,
      aspect_ratio: img.aspect_ratio,
      created_at: img.created_at,
    })),
    decks: decksWithThumbs,
  });
}
