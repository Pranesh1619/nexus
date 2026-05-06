"use client";

import React, { useState } from "react";
import Link from "next/link";
import { resetPasswordDirect } from "../actions";
import StatusModal from "@/components/StatusModal";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await resetPasswordDirect(formData);

    if (res?.error) {
      setError(res.error);
      setIsPending(false);
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg overflow-hidden" style={{ maxWidth: '450px', width: '100%', borderRadius: '24px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-5">
            <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle mb-3" style={{ width: 64, height: 64 }}>
              <i className="bi bi-shield-lock text-primary fs-2"></i>
            </div>
            <h2 className="fw-bold mb-2">Reset Password</h2>
            <p className="text-secondary small">Enter your email and a new password below to update your account instantly.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label x-small fw-bold text-secondary uppercase">Email Address</label>
              <input 
                name="email" 
                type="email" 
                className="form-control form-control-sm bg-light border-0 px-3 py-2" 
                placeholder="admin@virpa.com" 
                required 
              />
            </div>

            <div className="mb-4">
              <label className="form-label x-small fw-bold text-secondary uppercase">New Password</label>
              <input 
                name="password" 
                type="password" 
                className="form-control form-control-sm bg-light border-0 px-3 py-2" 
                placeholder="••••••••" 
                required 
              />
            </div>

            {error && (
              <div className="alert alert-danger border-0 small py-2 mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-circle"></i> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isPending}
              className="btn btn-primary w-100 py-2 fw-bold shadow-sm mb-3"
            >
              {isPending ? 'Updating...' : 'Update Password'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-decoration-none x-small fw-bold text-primary uppercase">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>

      {success && (
        <StatusModal 
          id="resetSuccessModal" 
          type="success" 
          title="Password Reset!" 
          message="Your password has been successfully updated. You can now login with your new credentials."
          onConfirm={() => window.location.href = '/login'}
        />
      )}
    </div>
  );
}
