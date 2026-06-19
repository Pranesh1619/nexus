"use client";

import { useState } from "react";
import Link from "next/link";
import { registerUser } from "./actions";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await registerUser(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg p-4 w-100" style={{ maxWidth: "420px", borderRadius: "16px" }}>
        <div className="text-center mb-4">
          <i className="bi bi-intersect text-success fs-1"></i>
          <h2 className="fw-bold mt-3 fs-3">Create your account</h2>
        </div>

        {error && (
          <div className="alert alert-danger small py-2 px-3 rounded-3 mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="form-label x-small fw-bold text-secondary">
                First Name <span className="text-danger fw-bold">*</span>
              </label>
              <input 
                name="firstName"
                type="text" 
                className="form-control form-control-sm bg-light border-0 px-3 py-2" 
                required
                placeholder="John" 
                style={{ height: "42px", borderRadius: "8px" }}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label x-small fw-bold text-secondary">Last Name</label>
              <input 
                name="lastName"
                type="text" 
                className="form-control form-control-sm bg-light border-0 px-3 py-2" 
                placeholder="Doe" 
                style={{ height: "42px", borderRadius: "8px" }}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label x-small fw-bold text-secondary">
              Email address <span className="text-danger fw-bold">*</span>
            </label>
            <input 
              name="email"
              type="email" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2" 
              required
              placeholder="john@example.com" 
              style={{ height: "42px", borderRadius: "8px" }}
            />
          </div>

          <div className="mb-4">
            <label className="form-label x-small fw-bold text-secondary">Phone Number</label>
            <input 
              name="phone"
              type="tel" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2" 
              placeholder="+1 (555) 019-2834" 
              style={{ height: "42px", borderRadius: "8px" }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
            disabled={loading}
            style={{ height: "48px", borderRadius: "10px", fontSize: "16px" }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm"></span>
            ) : null}
            <span>Create account</span>
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-top">
          <p className="small text-secondary mb-0">
            Already have an account? <Link href="/login" className="text-success fw-bold text-decoration-none">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
