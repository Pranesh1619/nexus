"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg p-4 w-100" style={{ maxWidth: "400px" }}>
        <div className="text-center mb-4">
          <i className="bi bi-intersect text-success fs-1"></i>
          <h2 className="fw-bold mt-2">Forgot password?</h2>
          <p className="text-secondary small">{"Enter your email and we'll send you a link."}</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary">Email address</label>
              <input 
                type="email" 
                className="form-control" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com" 
              />
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2">
              Send reset link
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <i className="bi bi-check-circle text-success fs-1 mb-3"></i>
            <h5 className="fw-bold">Check your email</h5>
            <p className="text-secondary small">{"We've sent a password reset link to "}<strong>{email}</strong>.</p>
          </div>
        )}

        <div className="text-center mt-4 pt-3 border-top">
          <Link href="/login" className="text-success fw-bold text-decoration-none small">
            <i className="bi bi-chevron-left me-1"></i> Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}
