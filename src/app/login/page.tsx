"use client";

import { useState } from "react";
import Link from "next/link";
import { loginUser } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await loginUser(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg p-4 w-100" style={{ maxWidth: "400px" }}>
        <div className="text-center mb-4">
          <i className="bi bi-intersect text-success fs-1"></i>
          <h2 className="fw-bold mt-2">Sign in to Nexus</h2>
          <p className="text-secondary small">Enter your details below.</p>
        </div>

        {error && (
          <div className="alert alert-danger small py-2" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary text-uppercase x-small">Email address</label>
            <input 
              name="email"
              type="email" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2" 
              required
              placeholder="admin@nexus.com" 
            />
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between">
              <label className="form-label small fw-bold text-secondary text-uppercase x-small">Password</label>
              <Link href="/login/forgot-password" title="Forgot Password" className="text-primary small text-decoration-none fw-bold">Forgot password?</Link>
            </div>
            <input 
              name="password"
              type="password" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2" 
              required
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2 mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2"></span>
            ) : null}
            Login
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-top">
          <p className="small text-secondary mb-0">
            Don’t have an account? <Link href="/register" className="text-success fw-bold text-decoration-none">Get started</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
