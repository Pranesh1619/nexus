import React from "react";
import { getAllUsers } from "./actions";
import UserList from "./UserList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UserListingPage() {
  const users = await getAllUsers();

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">User Management</h2>
          <p className="text-secondary small">Manage your team members and their roles.</p>
        </div>
        <Link href="/admin/users/new" className="btn btn-primary">
          <i className="bi bi-person-plus me-2"></i> Add User
        </Link>
      </div>

      <UserList users={users} />
    </div>
  );
}
