import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import AccountClient from "./account-client";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user) redirect("/login");

  return (
    <AccountClient
      initialUser={{
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: session.isAdmin,
      }}
    />
  );
}
