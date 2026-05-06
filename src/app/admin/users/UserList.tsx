"use client";

import React, { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (deleteId) {
      startTransition(async () => {
        try {
          await deleteUser(deleteId);
          setDeleteId(null);
        } catch (err) {
          console.error("Failed to delete user:", err);
        }
      });
    }
  };

  return (
    <>
      <div className="card border-0 shadow-sm">

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
                        <div className=" bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width: 32, height: 32}}>
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
                          disabled={isPending}
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

      {/* 100% React State-Driven Delete Confirmation Modal - Rendered Outside Card Transform Block */}
      {deleteId && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{ 
            zIndex: 1050, 
            backgroundColor: "rgba(15, 23, 42, 0.45)", 
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease"
          }}
        >
          <div className="card border-0 shadow-lg p-4 w-100 mx-3 text-center bg-white" style={{ maxWidth: "420px", borderRadius: "20px" }}>
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "60px", height: "60px" }}>
              <i className="bi bi-exclamation-triangle fs-3"></i>
            </div>
            
            <h4 className="fw-bold text-dark mb-2">Remove User?</h4>
            <p className="text-secondary small mb-4">
              Are you sure you want to remove this team member? This action is permanent and they will completely lose access to the system.
            </p>

            <div className="d-flex gap-3 justify-content-center">
              <button 
                type="button" 
                className="btn btn-light px-4 py-2 small fw-bold text-secondary"
                style={{ borderRadius: "10px" }}
                disabled={isPending}
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger px-4 py-2 small fw-bold d-flex align-items-center gap-1.5"
                style={{ borderRadius: "10px" }}
                disabled={isPending}
                onClick={handleDelete}
              >
                {isPending && <span className="spinner-border spinner-border-sm" role="status"></span>}
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Progress Overlay */}
      {isPending && !deleteId && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 animate-fade" 
          style={{ zIndex: 1060 }}
        >
          <div className="card p-4 border-0 shadow-lg text-center bg-white" style={{ maxWidth: "400px", borderRadius: "16px" }}>
            <div className="spinner-border text-danger mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="fw-bold text-dark mb-1">Removing User Profile...</h5>
            <p className="text-secondary small mb-0 px-2">Deleting account details, credentials and active token permissions from the system registry.</p>
          </div>
        </div>
      )}
    </>
  );
}
