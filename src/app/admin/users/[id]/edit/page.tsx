import React from "react";
import { getUserById } from "../../actions";
import { notFound } from "next/navigation";
import EditUserForm from "./EditUserForm";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ success?: string }> }) {
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
    status: user.status || "Active"
  };

  return <EditUserForm user={typedUser} success={success === "true"} />;
}
