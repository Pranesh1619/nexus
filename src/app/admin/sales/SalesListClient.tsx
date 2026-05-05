"use client";

import React from "react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { deleteUser } from "./actions";

export default function SalesListClient({ users }: { users: any[] }) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="border-0 small text-secondary">Agent</th>
              <th className="border-0 small text-secondary">Email</th>
              <th className="border-0 small text-secondary">Status</th>
              <th className="border-0 small text-secondary text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-5 text-center text-secondary small">
                  No sales team members found. Add one to get started.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center fw-bold text-success" style={{width: 32, height: 32}}>
                        {user.name.charAt(0)}
                      </div>
                      <span className="fw-bold small">{user.name}</span>
                    </div>
                  </td>
                  <td className="small text-secondary">{user.email}</td>
                  <td>
                    <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 small">ACTIVE</span>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end align-items-center gap-2">
                      <Link href={`/admin/sales/${user.id}`} className="btn btn-sm btn-light border-0 text-primary" title="View Stats">
                        <i className="bi bi-eye"></i>
                      </Link>
                      <Link href={`/admin/sales/${user.id}/edit`} className="btn btn-sm btn-light border-0 text-info" title="Edit Agent">
                        <i className="bi bi-pencil-square"></i>
                      </Link>
                      <DeleteButton 
                        id={user.id} 
                        onDelete={async () => { await deleteUser(user.id); }} 
                        className="btn btn-sm btn-light border-0 text-danger"
                        title="Remove Agent?"
                        message={`Are you sure you want to remove ${user.name} from the sales team?`}
                      />
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
