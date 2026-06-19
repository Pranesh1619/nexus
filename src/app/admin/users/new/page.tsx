import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NewUserClient from "./NewUserClient";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  if (!userRole || !["SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN"].includes(userRole)) {
    redirect("/admin");
  }

  return <NewUserClient currentUserRole={userRole} />;
}
