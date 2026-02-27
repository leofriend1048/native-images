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

    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chat_id TEXT REFERENCES chats(id) ON DELETE SET NULL,
      url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      aspect_ratio TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_personas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS creative_decks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      image_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

// ─── Generated Images ─────────────────────────────────────────────────────────

export interface GeneratedImage {
  id: string;
  user_id: string;
  chat_id: string | null;
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
    sql: `INSERT INTO generated_images (id, user_id, chat_id, url, prompt, model, aspect_ratio)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [img.id, img.user_id, img.chat_id, img.url, img.prompt, img.model, img.aspect_ratio],
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
  name: string;
  description: string;
  created_at: string;
}

export async function getPersonasByUser(userId: string): Promise<UserPersona[]> {
  const result = await client.execute({
    sql: `SELECT * FROM user_personas WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as UserPersona[];
}

export async function createPersona(
  persona: Omit<UserPersona, "created_at">
): Promise<UserPersona> {
  await client.execute({
    sql: `INSERT INTO user_personas (id, user_id, name, description) VALUES (?, ?, ?, ?)`,
    args: [persona.id, persona.user_id, persona.name, persona.description],
  });
  const result = await client.execute({
    sql: `SELECT * FROM user_personas WHERE id = ?`,
    args: [persona.id],
  });
  return result.rows[0] as unknown as UserPersona;
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
  token: string;
  title: string;
  image_ids: string; // JSON array of generated_image ids
  created_at: string;
}

export async function createDeck(
  deck: Omit<CreativeDeck, "created_at">
): Promise<CreativeDeck> {
  await client.execute({
    sql: `INSERT INTO creative_decks (id, user_id, token, title, image_ids) VALUES (?, ?, ?, ?, ?)`,
    args: [deck.id, deck.user_id, deck.token, deck.title, deck.image_ids],
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
