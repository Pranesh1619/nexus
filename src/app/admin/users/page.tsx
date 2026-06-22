import React from "react";
import { getAllUsers } from "./actions";
import UserList from "./UserList";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UserListingPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  if (!userRole || !["SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN"].includes(userRole)) {
    redirect("/admin");
  }

  let users = await getAllUsers();
  const userCompanyId = cookieStore.get("user_company_id")?.value;
  
  if (userRole === "COMPANY_ADMIN" || userRole === "ADMIN") {
    users = users.filter(u => u.role === "SALES" && u.companyId === userCompanyId);
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">User Management</h2>
          <p className="text-secondary small">
            {userRole === "SUPER_ADMIN" ? "Manage all user accounts including super admins, company administrators, and sales agents." : "Manage your sales agents."}
          </p>
        </div>
        <Link href="/admin/users/new" className="btn btn-primary">
          <i className="bi bi-person-plus me-2"></i> Add User
        </Link>
      </div>

      <UserList users={users} />
    </div>
  );
}
