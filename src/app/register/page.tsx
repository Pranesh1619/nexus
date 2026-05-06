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

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg p-4 w-100" style={{ maxWidth: "400px" }}>
        <div className="text-center mb-4">
          <i className="bi bi-intersect text-success fs-1"></i>
          <h2 className="fw-bold mt-2">Get started free</h2>
          <p className="text-secondary small">Create your Nexus account.</p>
        </div>

        {error && (
          <div className="alert alert-danger small py-2" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label x-small fw-bold text-secondary uppercase">Full Name</label>
            <input 
              name="name"
              type="text" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2" 
              required
              placeholder="John Doe" 
            />
          </div>

          <div className="mb-3">
            <label className="form-label x-small fw-bold text-secondary uppercase">Email address</label>
            <input 
              name="email"
              type="email" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2" 
              required
              placeholder="john@example.com" 
            />
          </div>

          <div className="mb-3">
            <label className="form-label x-small fw-bold text-secondary uppercase">Password</label>
            <div className="position-relative">
              <input 
                name="password"
                type={showPassword ? "text" : "password"} 
                className="form-control form-control-sm bg-light border-0 px-3 py-2 pe-5" 
                required
                placeholder="••••••••" 
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary text-decoration-none py-0 px-3"
                onClick={() => setShowPassword(!showPassword)}
                style={{ zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`} style={{ fontSize: "1.1rem" }}></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2 mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2"></span>
            ) : null}
            Create account
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
