"use client";

import React, { useTransition } from "react";
import { createUser } from "../actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewUserPage() {
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
                <label className="form-label">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="e.g. Alex Johnson" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="alex@virpa.com" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Access Role</label>
                <select name="role" className="form-select form-select-sm bg-light border-0 small px-3 py-2">
                  <option value="SALES">Sales Agent</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Initial Password</label>
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

      {/* Account Creation High-Fidelity Overlay */}
      {isPending && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 animate-fade" 
          style={{ zIndex: 1060 }}
        >
          <div className="card p-4 border-0 shadow-lg text-center bg-white" style={{ maxWidth: "400px", borderRadius: "16px" }}>
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
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
