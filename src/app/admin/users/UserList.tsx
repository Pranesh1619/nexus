"use client";

import React, { useState } from "react";
import Link from "next/link";
import { deleteUser } from "./actions";
import StatusModal from "@/components/StatusModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

export default function UserList({ users }: { users: User[] }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteUser(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <StatusModal 
        id="confirmDeleteUserModal"
        type="confirm"
        title="Remove User?"
        message="Are you sure you want to remove this team member? They will lose all access to the system."
        onConfirm={handleDelete}
      />

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="border-0 small text-secondary">User</th>
              <th className="border-0 small text-secondary">Role</th>
              <th className="border-0 small text-secondary">Status</th>
              <th className="border-0 small text-secondary">Joined</th>
              <th className="border-0 small text-secondary text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-5 text-center text-secondary small">No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width: 32, height: 32}}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="fw-bold small">{user.name}</div>
                        <div className="text-secondary x-small">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-info bg-opacity-10 text-info'} small fw-normal`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 small">
                      {user.status || 'Active'}
                    </span>
                  </td>
                  <td className="small text-secondary">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end align-items-center gap-2">
                      <Link href={`/admin/users/${user.id}`} className="btn btn-sm btn-light border-0 text-primary" title="View">
                        <i className="bi bi-eye"></i>
                      </Link>
                      <Link href={`/admin/users/${user.id}/edit`} className="btn btn-sm btn-light border-0 text-info" title="Edit">
                        <i className="bi bi-pencil-square"></i>
                      </Link>
                      <button 
                        onClick={() => setDeleteId(user.id)}
                        data-bs-toggle="modal"
                        data-bs-target="#confirmDeleteUserModal"
                        className="btn btn-sm btn-light border-0 text-danger" 
                        title="Delete"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
