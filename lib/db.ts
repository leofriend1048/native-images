import { createClient } from "@libsql/client";
import { nanoid } from "nanoid";
import { encrypt, decrypt, encryptSelfContained } from "./crypto";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Deterministic IDs for seed workspaces (idempotent migrations)
const MTB_WORKSPACE_ID = "ws_mtb";
const NFMD_WORKSPACE_ID = "ws_nfmd";

export { MTB_WORKSPACE_ID, NFMD_WORKSPACE_ID };

export async function initSchema() {
  // Execute each CREATE TABLE individually to avoid OOM from large batched executeMultiple
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      default_workspace_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      workspace_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      anthropic_api_key_enc TEXT,
      replicate_api_token_enc TEXT,
      encryption_iv TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT,
      title TEXT NOT NULL,
      thumbnail_url TEXT,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chat_id TEXT REFERENCES chats(id) ON DELETE SET NULL,
      workspace_id TEXT,
      url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      aspect_ratio TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_personas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      research TEXT,
      research_status TEXT DEFAULT 'none',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS creative_decks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT,
      token TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      image_ids TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_logins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrations: add columns to existing installations (catch-ignore pattern)
  await client.execute(
    `ALTER TABLE creative_decks ADD COLUMN active INTEGER NOT NULL DEFAULT 1`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE users ADD COLUMN default_workspace_id TEXT`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE chats ADD COLUMN workspace_id TEXT`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE generated_images ADD COLUMN workspace_id TEXT`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE user_personas ADD COLUMN workspace_id TEXT`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE creative_decks ADD COLUMN workspace_id TEXT`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE invites ADD COLUMN workspace_id TEXT`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE user_personas ADD COLUMN research TEXT`
  ).catch(() => {});
  await client.execute(
    `ALTER TABLE user_personas ADD COLUMN research_status TEXT DEFAULT 'none'`
  ).catch(() => {});

  // Seed workspaces
  await client.execute({
    sql: `INSERT OR IGNORE INTO workspaces (id, name, slug) VALUES (?, ?, ?)`,
    args: [MTB_WORKSPACE_ID, "Michael Todd Beauty", "michael-todd-beauty"],
  });
  await client.execute({
    sql: `INSERT OR IGNORE INTO workspaces (id, name, slug) VALUES (?, ?, ?)`,
    args: [NFMD_WORKSPACE_ID, "NasalFresh MD", "nasalfresh-md"],
  });

  // Encrypt and store existing env API keys on MTB workspace (only if not already set)
  const mtb = await getWorkspaceById(MTB_WORKSPACE_ID);
  if (mtb && !mtb.anthropic_api_key_enc && process.env.ANTHROPIC_API_KEY) {
    await updateWorkspaceApiKeys(
      MTB_WORKSPACE_ID,
      process.env.ANTHROPIC_API_KEY,
      process.env.REPLICATE_API_TOKEN || ""
    );
  }

  // Backfill: assign existing content to MTB workspace
  await client.execute({
    sql: `UPDATE chats SET workspace_id = ? WHERE workspace_id IS NULL`,
    args: [MTB_WORKSPACE_ID],
  });
  await client.execute({
    sql: `UPDATE generated_images SET workspace_id = ? WHERE workspace_id IS NULL`,
    args: [MTB_WORKSPACE_ID],
  });
  await client.execute({
    sql: `UPDATE user_personas SET workspace_id = ? WHERE workspace_id IS NULL`,
    args: [MTB_WORKSPACE_ID],
  });
  await client.execute({
    sql: `UPDATE creative_decks SET workspace_id = ? WHERE workspace_id IS NULL`,
    args: [MTB_WORKSPACE_ID],
  });

  // Backfill: add all existing users as MTB workspace members
  const allUsers = await getAllUsers();
  for (const u of allUsers) {
    await addWorkspaceMember(MTB_WORKSPACE_ID, u.id, "member").catch(() => {});
  }

  // Make admin user owner of both seed workspaces
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const adminUser = await getUserByEmail(adminEmail);
    if (adminUser) {
      await updateMemberRole(MTB_WORKSPACE_ID, adminUser.id, "owner").catch(() => {});
      await addWorkspaceMember(NFMD_WORKSPACE_ID, adminUser.id, "owner").catch(() => {});
    }
  }

  // Set default workspace for users without one
  await client.execute({
    sql: `UPDATE users SET default_workspace_id = ? WHERE default_workspace_id IS NULL`,
    args: [MTB_WORKSPACE_ID],
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  is_admin: number;
  default_workspace_id: string | null;
  created_at: string;
}

export interface Invite {
  id: string;
  email: string;
  token: string;
  used: number;
  workspace_id: string | null;
  created_at: string;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });
  return result.rows[0] as unknown as User | undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });
  return result.rows[0] as unknown as User | undefined;
}

export async function createUser(user: Omit<User, "created_at" | "default_workspace_id"> & { default_workspace_id?: string | null }): Promise<User> {
  await client.execute({
    sql: "INSERT INTO users (id, email, name, password_hash, is_admin, default_workspace_id) VALUES (?, ?, ?, ?, ?, ?)",
    args: [user.id, user.email, user.name, user.password_hash, user.is_admin, user.default_workspace_id ?? null],
  });
  return (await getUserById(user.id))!;
}

export async function updateUserPassword(id: string, password_hash: string): Promise<void> {
  await client.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [password_hash, id],
  });
}

export async function updateUserName(id: string, name: string): Promise<void> {
  await client.execute({
    sql: "UPDATE users SET name = ? WHERE id = ?",
    args: [name, id],
  });
}

export async function updateUserDefaultWorkspace(id: string, workspaceId: string): Promise<void> {
  await client.execute({
    sql: "UPDATE users SET default_workspace_id = ? WHERE id = ?",
    args: [workspaceId, id],
  });
}

export async function getAllUsers(): Promise<Omit<User, "password_hash">[]> {
  const result = await client.execute(
    "SELECT id, email, name, is_admin, default_workspace_id, created_at FROM users ORDER BY created_at DESC"
  );
  return result.rows as unknown as Omit<User, "password_hash">[];
}

export async function logUserLogin(userId: string): Promise<void> {
  await client.execute({
    sql: "INSERT INTO user_logins (id, user_id) VALUES (?, ?)",
    args: [nanoid(), userId],
  });
}

export interface UserWithStats extends Omit<User, "password_hash"> {
  login_count: number;
  last_login: string | null;
  last_active: string | null;
  image_count: number;
  chat_count: number;
  deck_count: number;
}

export async function getUsersWithStats(): Promise<UserWithStats[]> {
  const users = await getAllUsers();
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) return [];

  const placeholders = userIds.map(() => "?").join(",");
  const args = [...userIds];

  const [loginRows, imageRows, chatRows, deckRows] = await Promise.all([
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as last FROM user_logins WHERE user_id IN (${placeholders}) GROUP BY user_id`,
      args,
    }),
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as last FROM generated_images WHERE user_id IN (${placeholders}) GROUP BY user_id`,
      args,
    }),
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(updated_at) as last FROM chats WHERE user_id IN (${placeholders}) GROUP BY user_id`,
      args,
    }),
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as last FROM creative_decks WHERE user_id IN (${placeholders}) GROUP BY user_id`,
      args,
    }),
  ]);

  const byUser = new Map<
    string,
    { login_count: number; last_login: string | null; image_count: number; image_last: string | null; chat_count: number; chat_last: string | null; deck_count: number; deck_last: string | null }
  >();
  for (const u of users) {
    byUser.set(u.id, { login_count: 0, last_login: null, image_count: 0, image_last: null, chat_count: 0, chat_last: null, deck_count: 0, deck_last: null });
  }
  for (const row of loginRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) {
      entry.login_count = Number(row.cnt);
      entry.last_login = row.last;
    }
  }
  for (const row of imageRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) {
      entry.image_count = Number(row.cnt);
      entry.image_last = row.last;
    }
  }
  for (const row of chatRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) {
      entry.chat_count = Number(row.cnt);
      entry.chat_last = row.last;
    }
  }
  for (const row of deckRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) {
      entry.deck_count = Number(row.cnt);
      entry.deck_last = row.last;
    }
  }

  return users.map((u) => {
    const s = byUser.get(u.id)!;
    const lastActive = [s.last_login, s.image_last, s.chat_last, s.deck_last]
      .filter(Boolean)
      .sort()
      .pop() as string | null;
    return {
      ...u,
      login_count: s.login_count,
      last_login: s.last_login,
      last_active: lastActive,
      image_count: s.image_count,
      chat_count: s.chat_count,
      deck_count: s.deck_count,
    };
  });
}

export async function getUsersWithStatsByWorkspace(workspaceId: string): Promise<UserWithStats[]> {
  // Get users who are members of this workspace
  const membersResult = await client.execute({
    sql: `SELECT u.id, u.email, u.name, u.is_admin, u.default_workspace_id, u.created_at
          FROM users u
          INNER JOIN workspace_members wm ON wm.user_id = u.id
          WHERE wm.workspace_id = ?
          ORDER BY u.created_at DESC`,
    args: [workspaceId],
  });
  const users = membersResult.rows as unknown as Omit<User, "password_hash">[];
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) return [];

  const placeholders = userIds.map(() => "?").join(",");

  const [loginRows, imageRows, chatRows, deckRows] = await Promise.all([
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as last FROM user_logins WHERE user_id IN (${placeholders}) GROUP BY user_id`,
      args: userIds,
    }),
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as last FROM generated_images WHERE user_id IN (${placeholders}) AND workspace_id = ? GROUP BY user_id`,
      args: [...userIds, workspaceId],
    }),
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(updated_at) as last FROM chats WHERE user_id IN (${placeholders}) AND workspace_id = ? GROUP BY user_id`,
      args: [...userIds, workspaceId],
    }),
    client.execute({
      sql: `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as last FROM creative_decks WHERE user_id IN (${placeholders}) AND workspace_id = ? GROUP BY user_id`,
      args: [...userIds, workspaceId],
    }),
  ]);

  const byUser = new Map<
    string,
    { login_count: number; last_login: string | null; image_count: number; image_last: string | null; chat_count: number; chat_last: string | null; deck_count: number; deck_last: string | null }
  >();
  for (const u of users) {
    byUser.set(u.id, { login_count: 0, last_login: null, image_count: 0, image_last: null, chat_count: 0, chat_last: null, deck_count: 0, deck_last: null });
  }
  for (const row of loginRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) { entry.login_count = Number(row.cnt); entry.last_login = row.last; }
  }
  for (const row of imageRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) { entry.image_count = Number(row.cnt); entry.image_last = row.last; }
  }
  for (const row of chatRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) { entry.chat_count = Number(row.cnt); entry.chat_last = row.last; }
  }
  for (const row of deckRows.rows as unknown as Array<{ user_id: string; cnt: number; last: string | null }>) {
    const entry = byUser.get(row.user_id);
    if (entry) { entry.deck_count = Number(row.cnt); entry.deck_last = row.last; }
  }

  return users.map((u) => {
    const s = byUser.get(u.id)!;
    const lastActive = [s.last_login, s.image_last, s.chat_last, s.deck_last]
      .filter(Boolean).sort().pop() as string | null;
    return { ...u, login_count: s.login_count, last_login: s.last_login, last_active: lastActive, image_count: s.image_count, chat_count: s.chat_count, deck_count: s.deck_count };
  });
}

export async function deleteUser(id: string): Promise<void> {
  await client.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [id],
  });
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export async function getInviteByToken(token: string): Promise<Invite | undefined> {
  const result = await client.execute({
    sql: "SELECT * FROM invites WHERE token = ?",
    args: [token],
  });
  return result.rows[0] as unknown as Invite | undefined;
}

export async function createInvite(invite: Omit<Invite, "created_at" | "used">): Promise<Invite> {
  await client.execute({
    sql: "INSERT INTO invites (id, email, token, used, workspace_id) VALUES (?, ?, ?, 0, ?)",
    args: [invite.id, invite.email, invite.token, invite.workspace_id ?? null],
  });
  return (await getInviteByToken(invite.token))!;
}

export async function markInviteUsed(token: string): Promise<void> {
  await client.execute({
    sql: "UPDATE invites SET used = 1 WHERE token = ?",
    args: [token],
  });
}

export async function getAllInvites(): Promise<Invite[]> {
  const result = await client.execute(
    "SELECT * FROM invites ORDER BY created_at DESC"
  );
  return result.rows as unknown as Invite[];
}

export async function getInvitesByWorkspace(workspaceId: string): Promise<Invite[]> {
  const result = await client.execute({
    sql: "SELECT * FROM invites WHERE workspace_id = ? ORDER BY created_at DESC",
    args: [workspaceId],
  });
  return result.rows as unknown as Invite[];
}

export async function deleteInvite(id: string): Promise<void> {
  await client.execute({
    sql: "DELETE FROM invites WHERE id = ?",
    args: [id],
  });
}

// ─── Workspaces ──────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  anthropic_api_key_enc: string | null;
  replicate_api_token_enc: string | null;
  encryption_iv: string | null;
  created_by: string | null;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export async function createWorkspace(
  name: string,
  slug: string,
  createdBy: string,
  anthropicApiKey?: string,
  replicateApiToken?: string
): Promise<Workspace> {
  const id = nanoid();
  await client.execute({
    sql: `INSERT INTO workspaces (id, name, slug, created_by) VALUES (?, ?, ?, ?)`,
    args: [id, name, slug, createdBy],
  });
  if (anthropicApiKey || replicateApiToken) {
    await updateWorkspaceApiKeys(id, anthropicApiKey || "", replicateApiToken || "");
  }
  return (await getWorkspaceById(id))!;
}

export async function getWorkspaceById(id: string): Promise<Workspace | undefined> {
  const result = await client.execute({
    sql: "SELECT * FROM workspaces WHERE id = ?",
    args: [id],
  });
  return result.rows[0] as unknown as Workspace | undefined;
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | undefined> {
  const result = await client.execute({
    sql: "SELECT * FROM workspaces WHERE slug = ?",
    args: [slug],
  });
  return result.rows[0] as unknown as Workspace | undefined;
}

export async function getAllWorkspaces(): Promise<Workspace[]> {
  const result = await client.execute({
    sql: "SELECT * FROM workspaces ORDER BY name ASC",
    args: [],
  });
  return result.rows as unknown as Workspace[];
}

export async function getWorkspacesByUserId(userId: string): Promise<Workspace[]> {
  const result = await client.execute({
    sql: `SELECT w.* FROM workspaces w
          INNER JOIN workspace_members wm ON wm.workspace_id = w.id
          WHERE wm.user_id = ?
          ORDER BY w.name ASC`,
    args: [userId],
  });
  return result.rows as unknown as Workspace[];
}

export async function updateWorkspaceName(id: string, name: string): Promise<void> {
  await client.execute({
    sql: "UPDATE workspaces SET name = ? WHERE id = ?",
    args: [name, id],
  });
}

export async function updateWorkspaceApiKeys(
  workspaceId: string,
  anthropicApiKey: string,
  replicateApiToken: string
): Promise<void> {
  // Each key is encrypted with its own IV embedded in the ciphertext (self-contained).
  // The encryption_iv column is kept for legacy compat but not needed for new writes.
  const anthropicEnc = anthropicApiKey ? encryptSelfContained(anthropicApiKey) : null;
  const replicateEnc = replicateApiToken ? encryptSelfContained(replicateApiToken) : null;
  await client.execute({
    sql: `UPDATE workspaces SET anthropic_api_key_enc = ?, replicate_api_token_enc = ?, encryption_iv = ? WHERE id = ?`,
    args: [
      anthropicEnc || null,
      replicateEnc || null,
      "self-contained",
      workspaceId,
    ],
  });
}

export async function getWorkspaceApiKeys(workspaceId: string): Promise<{
  anthropicApiKey: string;
  replicateApiToken: string;
}> {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new Error("Workspace not found");

  let anthropicApiKey = "";
  let replicateApiToken = "";

  if (ws.anthropic_api_key_enc) {
    try { anthropicApiKey = decrypt(ws.anthropic_api_key_enc, ws.encryption_iv ?? ""); } catch (e) {
      console.error("Failed to decrypt Anthropic API key for workspace", workspaceId, e);
    }
  }
  if (ws.replicate_api_token_enc) {
    try { replicateApiToken = decrypt(ws.replicate_api_token_enc, ws.encryption_iv ?? ""); } catch (e) {
      console.error("Failed to decrypt Replicate API token for workspace", workspaceId, e);
    }
  }

  return { anthropicApiKey, replicateApiToken };
}

export async function deleteWorkspace(id: string): Promise<void> {
  await client.execute({
    sql: "DELETE FROM workspaces WHERE id = ?",
    args: [id],
  });
}

// ─── Workspace Members ───────────────────────────────────────────────────────

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: string = "member"
): Promise<void> {
  await client.execute({
    sql: `INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)`,
    args: [nanoid(), workspaceId, userId, role],
  });
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  await client.execute({
    sql: `DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
    args: [workspaceId, userId],
  });
}

export async function getWorkspaceMembers(workspaceId: string): Promise<
  (WorkspaceMember & { email: string; name: string | null })[]
> {
  const result = await client.execute({
    sql: `SELECT wm.*, u.email, u.name FROM workspace_members wm
          INNER JOIN users u ON u.id = wm.user_id
          WHERE wm.workspace_id = ?
          ORDER BY wm.created_at ASC`,
    args: [workspaceId],
  });
  return result.rows as unknown as (WorkspaceMember & { email: string; name: string | null })[];
}

export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | undefined> {
  const result = await client.execute({
    sql: `SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
    args: [workspaceId, userId],
  });
  return result.rows[0] as unknown as WorkspaceMember | undefined;
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: string
): Promise<void> {
  await client.execute({
    sql: `UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?`,
    args: [role, workspaceId, userId],
  });
}

// ─── Chats ────────────────────────────────────────────────────────────────────

export interface ChatRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  thumbnail_url: string | null;
  messages: string; // JSON-serialised UIMessage[]
  created_at: string;
  updated_at: string;
}

export type ChatSummary = Omit<ChatRecord, "messages">;

export async function getChatsByUser(userId: string): Promise<ChatSummary[]> {
  const result = await client.execute({
    sql: `SELECT id, user_id, workspace_id, title, thumbnail_url, created_at, updated_at
          FROM chats WHERE user_id = ? ORDER BY updated_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as ChatSummary[];
}

export async function getChatsByUserAndWorkspace(userId: string, workspaceId: string): Promise<ChatSummary[]> {
  const result = await client.execute({
    sql: `SELECT id, user_id, workspace_id, title, thumbnail_url, created_at, updated_at
          FROM chats WHERE user_id = ? AND workspace_id = ? ORDER BY updated_at DESC`,
    args: [userId, workspaceId],
  });
  return result.rows as unknown as ChatSummary[];
}

export async function getChatById(id: string): Promise<ChatRecord | undefined> {
  const result = await client.execute({
    sql: "SELECT * FROM chats WHERE id = ?",
    args: [id],
  });
  return result.rows[0] as unknown as ChatRecord | undefined;
}

export async function upsertChat(
  chat: Omit<ChatRecord, "created_at" | "updated_at">
): Promise<ChatRecord> {
  await client.execute({
    sql: `INSERT INTO chats (id, user_id, workspace_id, title, thumbnail_url, messages, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            thumbnail_url = excluded.thumbnail_url,
            messages = excluded.messages,
            updated_at = CURRENT_TIMESTAMP`,
    args: [chat.id, chat.user_id, chat.workspace_id, chat.title, chat.thumbnail_url, chat.messages],
  });
  return (await getChatById(chat.id))!;
}

export async function deleteChat(id: string): Promise<void> {
  await client.execute({
    sql: "DELETE FROM chats WHERE id = ?",
    args: [id],
  });
}

// ─── Generated Images ─────────────────────────────────────────────────────────

export interface GeneratedImage {
  id: string;
  user_id: string;
  chat_id: string | null;
  workspace_id: string | null;
  url: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  created_at: string;
}

export async function insertGeneratedImage(
  img: Omit<GeneratedImage, "created_at">
): Promise<void> {
  await client.execute({
    sql: `INSERT INTO generated_images (id, user_id, chat_id, workspace_id, url, prompt, model, aspect_ratio)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [img.id, img.user_id, img.chat_id, img.workspace_id ?? null, img.url, img.prompt, img.model, img.aspect_ratio],
  });
}

export async function getGeneratedImagesByUser(
  userId: string
): Promise<GeneratedImage[]> {
  const result = await client.execute({
    sql: `SELECT * FROM generated_images WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as GeneratedImage[];
}

export async function getGeneratedImagesByUserAndWorkspace(
  userId: string,
  workspaceId: string
): Promise<GeneratedImage[]> {
  const result = await client.execute({
    sql: `SELECT * FROM generated_images WHERE user_id = ? AND workspace_id = ? ORDER BY created_at DESC`,
    args: [userId, workspaceId],
  });
  return result.rows as unknown as GeneratedImage[];
}

export async function getGeneratedImagesByIds(
  ids: string[]
): Promise<GeneratedImage[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const result = await client.execute({
    sql: `SELECT * FROM generated_images WHERE id IN (${placeholders})`,
    args: ids,
  });
  return result.rows as unknown as GeneratedImage[];
}

// ─── User Personas ────────────────────────────────────────────────────────────

export interface UserPersona {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  description: string;
  research: string | null;
  research_status: string;
  created_at: string;
}

export async function getPersonasByUser(userId: string): Promise<UserPersona[]> {
  const result = await client.execute({
    sql: `SELECT * FROM user_personas WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as UserPersona[];
}

export async function getPersonasByUserAndWorkspace(userId: string, workspaceId: string): Promise<UserPersona[]> {
  const result = await client.execute({
    sql: `SELECT * FROM user_personas WHERE user_id = ? AND workspace_id = ? ORDER BY created_at DESC`,
    args: [userId, workspaceId],
  });
  return result.rows as unknown as UserPersona[];
}

export async function createPersona(
  persona: Omit<UserPersona, "created_at">
): Promise<UserPersona> {
  await client.execute({
    sql: `INSERT INTO user_personas (id, user_id, workspace_id, name, description, research, research_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [persona.id, persona.user_id, persona.workspace_id ?? null, persona.name, persona.description, persona.research ?? null, persona.research_status ?? "none"],
  });
  const result = await client.execute({
    sql: `SELECT * FROM user_personas WHERE id = ?`,
    args: [persona.id],
  });
  return result.rows[0] as unknown as UserPersona;
}

export async function getPersonaById(id: string): Promise<UserPersona | null> {
  const result = await client.execute({
    sql: `SELECT * FROM user_personas WHERE id = ?`,
    args: [id],
  });
  return (result.rows[0] as unknown as UserPersona) ?? null;
}

export async function updatePersonaResearch(
  id: string,
  research: string,
  status: "researching" | "complete" | "failed"
): Promise<void> {
  await client.execute({
    sql: `UPDATE user_personas SET research = ?, research_status = ? WHERE id = ?`,
    args: [research, status, id],
  });
}

export async function deletePersona(id: string, userId: string): Promise<void> {
  await client.execute({
    sql: `DELETE FROM user_personas WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
}

// ─── Creative Decks ───────────────────────────────────────────────────────────

export interface CreativeDeck {
  id: string;
  user_id: string;
  workspace_id: string | null;
  token: string;
  title: string;
  image_ids: string; // JSON array of generated_image ids
  active: number;    // 1 = live, 0 = deactivated
  created_at: string;
}

export async function createDeck(
  deck: Omit<CreativeDeck, "created_at">
): Promise<CreativeDeck> {
  await client.execute({
    sql: `INSERT INTO creative_decks (id, user_id, workspace_id, token, title, image_ids) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [deck.id, deck.user_id, deck.workspace_id ?? null, deck.token, deck.title, deck.image_ids],
  });
  const result = await client.execute({
    sql: `SELECT * FROM creative_decks WHERE id = ?`,
    args: [deck.id],
  });
  return result.rows[0] as unknown as CreativeDeck;
}

export async function getDeckByToken(token: string): Promise<CreativeDeck | undefined> {
  const result = await client.execute({
    sql: `SELECT * FROM creative_decks WHERE token = ?`,
    args: [token],
  });
  return result.rows[0] as unknown as CreativeDeck | undefined;
}

export async function getDecksByUser(userId: string): Promise<CreativeDeck[]> {
  const result = await client.execute({
    sql: `SELECT * FROM creative_decks WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as CreativeDeck[];
}

export async function getDecksByUserAndWorkspace(userId: string, workspaceId: string): Promise<CreativeDeck[]> {
  const result = await client.execute({
    sql: `SELECT * FROM creative_decks WHERE user_id = ? AND workspace_id = ? ORDER BY created_at DESC`,
    args: [userId, workspaceId],
  });
  return result.rows as unknown as CreativeDeck[];
}

export async function deleteDeckById(id: string): Promise<void> {
  await client.execute({
    sql: `DELETE FROM creative_decks WHERE id = ?`,
    args: [id],
  });
}

export async function setDeckActive(id: string, active: boolean): Promise<void> {
  await client.execute({
    sql: `UPDATE creative_decks SET active = ? WHERE id = ?`,
    args: [active ? 1 : 0, id],
  });
}

export async function renameDeck(id: string, title: string): Promise<void> {
  await client.execute({
    sql: `UPDATE creative_decks SET title = ? WHERE id = ?`,
    args: [title, id],
  });
}
