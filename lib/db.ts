import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function initSchema() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      thumbnail_url TEXT,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  is_admin: number;
  created_at: string;
}

export interface Invite {
  id: string;
  email: string;
  token: string;
  used: number;
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

export async function createUser(user: Omit<User, "created_at">): Promise<User> {
  await client.execute({
    sql: "INSERT INTO users (id, email, name, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)",
    args: [user.id, user.email, user.name, user.password_hash, user.is_admin],
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

export async function getAllUsers(): Promise<Omit<User, "password_hash">[]> {
  const result = await client.execute(
    "SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC"
  );
  return result.rows as unknown as Omit<User, "password_hash">[];
}

export async function deleteUser(id: string): Promise<void> {
  await client.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [id],
  });
}

export async function getInviteByToken(token: string): Promise<Invite | undefined> {
  const result = await client.execute({
    sql: "SELECT * FROM invites WHERE token = ?",
    args: [token],
  });
  return result.rows[0] as unknown as Invite | undefined;
}

export async function createInvite(invite: Omit<Invite, "created_at" | "used">): Promise<Invite> {
  await client.execute({
    sql: "INSERT INTO invites (id, email, token, used) VALUES (?, ?, ?, 0)",
    args: [invite.id, invite.email, invite.token],
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

export async function deleteInvite(id: string): Promise<void> {
  await client.execute({
    sql: "DELETE FROM invites WHERE id = ?",
    args: [id],
  });
}

// ─── Chats ────────────────────────────────────────────────────────────────────

export interface ChatRecord {
  id: string;
  user_id: string;
  title: string;
  thumbnail_url: string | null;
  messages: string; // JSON-serialised UIMessage[]
  created_at: string;
  updated_at: string;
}

export type ChatSummary = Omit<ChatRecord, "messages">;

export async function getChatsByUser(userId: string): Promise<ChatSummary[]> {
  const result = await client.execute({
    sql: `SELECT id, user_id, title, thumbnail_url, created_at, updated_at
          FROM chats WHERE user_id = ? ORDER BY updated_at DESC`,
    args: [userId],
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
    sql: `INSERT INTO chats (id, user_id, title, thumbnail_url, messages, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            thumbnail_url = excluded.thumbnail_url,
            messages = excluded.messages,
            updated_at = CURRENT_TIMESTAMP`,
    args: [chat.id, chat.user_id, chat.title, chat.thumbnail_url, chat.messages],
  });
  return (await getChatById(chat.id))!;
}

export async function deleteChat(id: string): Promise<void> {
  await client.execute({
    sql: "DELETE FROM chats WHERE id = ?",
    args: [id],
  });
}
