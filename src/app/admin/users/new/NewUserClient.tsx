"use client";

import React, { useTransition } from "react";
import { createUser } from "../actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewUserClient({ currentUserRole }: { currentUserRole: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createUser(formData);
        router.push("/admin/users");
      } catch (err) {
        console.error("Failed to create user:", err);
      }
    });
  }

  // Filter selectable roles based on the current user's role
  const getSelectableRoles = () => {
    if (currentUserRole === "SUPER_ADMIN") {
      return [
        { value: "SUPER_ADMIN", label: "Super Admin" },
        { value: "COMPANY_ADMIN", label: "Company Admin" }
      ];
    }
    // Company Admin, Admin, etc. can only create Sales Agent
    return [
      { value: "SALES", label: "Sales Agent" }
    ];
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/users" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Users</span>
        </Link>
        <h3 className="fw-bold mb-1">Add New User</h3>
        <p className="text-secondary x-small">Create a new agent or administrator account.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name <span className="text-danger">*</span></label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="e.g. Alex Johnson" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address <span className="text-danger">*</span></label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="alex@virpa.com" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Access Role <span className="text-danger">*</span></label>
                <select name="role" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={getSelectableRoles()[0]?.value || "SALES"}>
                  {getSelectableRoles().map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Initial Password <span className="text-danger">*</span></label>
                <input name="password" type="password" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="••••••••" required />
              </div>
            </div>
            <div className="d-grid d-md-flex justify-content-md-end mt-4 pt-3 border-top">
              <button type="submit" disabled={isPending} className="btn btn-primary px-5 py-2 small fw-bold shadow-sm d-flex align-items-center gap-2">
                {isPending && <span className="spinner-border spinner-border-sm" role="status"></span>}
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>

      {isPending && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 animate-fade" 
          style={{ zIndex: 1060 }}
        >
          <div className="card p-4 border-0 shadow-lg text-center bg-white mx-auto" style={{ maxWidth: "450px", borderRadius: "16px" }}>
            <div className="spinner-border text-primary mb-3 mx-auto" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="fw-bold text-dark mb-1">Creating Account...</h5>
            <p className="text-secondary small mb-0 px-2">Initializing new user profile and setting security keys.</p>
          </div>
        </div>
      )}
    </div>
  );
}
