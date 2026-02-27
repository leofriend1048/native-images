// Runs once on Next.js server startup (dev + production).
// Ensures the Turso database schema exists and the initial admin account is present.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSchema, getUserByEmail, createUser } = await import("./lib/db");
    const bcrypt = await import("bcryptjs");
    const { nanoid } = await import("nanoid");

    try {
      await initSchema();
      console.log("[db] Schema ready");
    } catch (err) {
      console.error("[db] Failed to initialise schema:", err);
      return;
    }

    // Auto-create the admin user when the database is fresh.
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    try {
      const existing = await getUserByEmail(adminEmail);
      if (!existing) {
        // Use a known temporary password so the admin can log in immediately.
        // The user should change this via /account after first login.
        const tempPassword = "ChangeMe123!";
        const password_hash = await bcrypt.hash(tempPassword, 12);
        await createUser({
          id: nanoid(),
          email: adminEmail,
          name: adminEmail.split("@")[0],
          password_hash,
          is_admin: 1,
        });
        console.log(`[db] Admin user created for ${adminEmail}`);
        console.log(`[db] ⚠️  Temporary password: ${tempPassword} — change it at /account`);
      }
    } catch (err) {
      console.error("[db] Failed to seed admin user:", err);
    }
  }
}
