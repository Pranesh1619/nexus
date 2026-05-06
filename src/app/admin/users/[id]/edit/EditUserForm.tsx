"use client";

import React, { useTransition } from "react";
import { updateUser } from "../../actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusModal from "@/components/StatusModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function EditUserForm({ user, success }: { user: User; success?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateUser(user.id, formData);
        router.push(`/admin/users/${user.id}/edit?success=true`);
        router.refresh();
      } catch (err) {
        console.error("Failed to update user:", err);
      }
    });
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/users" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Users</span>
        </Link>
        <div className="d-flex align-items-center gap-2">
          <h3 className="fw-bold mb-0">Edit User: {user.name}</h3>
        </div>
        <p className="text-secondary x-small mt-1">Manage access roles and personal information.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={user.name} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={user.email} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Access Role</label>
                <select name="role" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={user.role}>
                  <option value="SALES">Sales Agent</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Account Status</label>
                <select name="status" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={user.status || 'Active'}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <Link href="/admin/users" className="btn btn-light border-0 px-3 py-2 small">Cancel</Link>
              <button type="submit" disabled={isPending} className="btn btn-primary px-4 py-2 small fw-bold shadow-sm d-flex align-items-center gap-2">
                {isPending && <span className="spinner-border spinner-border-sm" role="status"></span>}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Save Changes High-Fidelity Overlay */}
      {isPending && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 animate-fade" 
          style={{ zIndex: 1060 }}
        >
          <div className="card p-4 border-0 shadow-lg text-center bg-white" style={{ maxWidth: "400px", borderRadius: "16px" }}>
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="fw-bold text-dark mb-1">Saving Changes...</h5>
            <p className="text-secondary small mb-0 px-2">Updating user profile details and refreshing access control keys.</p>
          </div>
        </div>
      )}

      {success && !isPending && (
        <StatusModal 
          id="userSuccessModal" 
          type="success" 
          title="User Updated!" 
          message="The user profile has been successfully updated."
        />
      )}
    </div>
  );
}
