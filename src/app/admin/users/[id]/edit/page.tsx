import React from "react";
import { getUserById } from "../../actions";
import { notFound, redirect } from "next/navigation";
import EditUserForm from "./EditUserForm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ success?: string }> }) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  if (!userRole || !["SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN"].includes(userRole)) {
    redirect("/admin");
  }

  const { id } = await params;
  const { success } = await searchParams;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  // Cast user object to match expected User interface in Client component
  const typedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || "Active",
    phone: user.phone || ""
  };

  return <EditUserForm user={typedUser} success={success === "true"} currentUserRole={userRole} />;
}
