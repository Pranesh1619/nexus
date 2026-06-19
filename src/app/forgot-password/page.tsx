"use client";

import React, { useState } from "react";
import Link from "next/link";
import { verifyUserEmail, resetPasswordDirect } from "../login/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email verification, 2: New password input, 3: Success
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyUserEmail(email);
      if (result.exists) {
        setStep(2);
      } else {
        setError("No account found with this email address.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword || !otp) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("otp", otp);

      const result = await resetPasswordDirect(formData);
      if (result.success) {
        setStep(3);
      } else {
        setError(result.error || "Failed to update password.");
      }
    } catch {
      setError("An error occurred during password update.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg p-4 w-100" style={{ maxWidth: "420px", borderRadius: "16px" }}>
        <div className="text-center mb-4">
          <i className="bi bi-intersect text-success fs-1"></i>
          <h2 className="fw-bold mt-2">Password Reset</h2>
          <p className="text-secondary small">
            {step === 1 && "Verify your registered email address."}
            {step === 2 && "Enter your new password below."}
            {step === 3 && "Password updated successfully!"}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 rounded-3 small mb-4" style={{ fontSize: "12.5px" }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleVerifyEmail}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary">Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com" 
                style={{ height: "46px", borderRadius: "10px", fontSize: "13.5px" }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-100 py-2.5 fw-bold" style={{ borderRadius: "10px" }}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">Verification Code (OTP)</label>
              <input 
                type="text" 
                className="form-control" 
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="758369" 
                style={{ height: "46px", borderRadius: "10px", fontSize: "13.5px" }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">New Password</label>
              <input 
                type="password" 
                className="form-control" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ height: "46px", borderRadius: "10px", fontSize: "13.5px" }}
              />
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary">Confirm New Password</label>
              <input 
                type="password" 
                className="form-control" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ height: "46px", borderRadius: "10px", fontSize: "13.5px" }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-100 py-2.5 fw-bold" style={{ borderRadius: "10px" }}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Resetting...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-3">
            <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "60px", height: "60px" }}>
              <i className="bi bi-check-circle fs-3"></i>
            </div>
            <h5 className="fw-bold">All Set!</h5>
            <p className="text-secondary small">Your account password has been updated. You can now use your new password to sign in.</p>
            <Link href="/login" className="btn btn-success w-100 py-2.5 fw-bold mt-2" style={{ borderRadius: "10px" }}>
              Go to Login
            </Link>
          </div>
        )}

        {step !== 3 && (
          <div className="text-center mt-4 pt-3 border-top">
            <Link href="/login" className="text-success fw-bold text-decoration-none small">
              <i className="bi bi-chevron-left me-1"></i> Return to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
