/**
 * Run this once to create your admin account:
 *   npx tsx scripts/create-admin.ts <password>
 *
 * Make sure ADMIN_EMAIL is set in .env.local before running.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createClient } from "@libsql/client";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.argv[2];

  if (!email) {
    console.error("Error: ADMIN_EMAIL is not set in .env.local");
    process.exit(1);
  }

  if (!password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <password>");
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length > 0) {
    console.log(`Admin account already exists for ${email}`);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 12);

  await db.execute({
    sql: "INSERT INTO users (id, email, name, password_hash, is_admin) VALUES (?, ?, ?, ?, 1)",
    args: [nanoid(), email, "Admin", hash],
  });

  console.log(`✓ Admin account created for ${email}`);
  console.log(`  Sign in at http://localhost:3000/login`);
}

main().catch(console.error);
