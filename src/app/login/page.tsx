"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { requestLoginOtp, verifyLoginOtp, logoutUser } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [step, setStep] = useState<1 | 2>(1); // 1: Enter email, 2: Enter OTP
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    logoutUser();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const res = await requestLoginOtp(email);
    if (res?.error) {
      setError(res.error);
    } else {
      setStep(2);
    }
    setLoading(false);
  };

  const triggerVerify = async (otpCode: string) => {
    if (otpCode.length < 6) return;
    setLoading(true);
    setError(null);

    const res = await verifyLoginOtp(email, otpCode);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      window.location.href = "/admin";
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpValues.join("");
    if (fullOtp.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    triggerVerify(fullOtp);
  };

  // Handle typing a digit
  const handleOtpChange = (value: string, index: number) => {
    const cleanValue = value.replace(/[^0-9]/g, ""); // Only allow numbers
    if (!cleanValue) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = "";
      setOtpValues(newOtpValues);
      return;
    }

    const newOtpValues = [...otpValues];
    newOtpValues[index] = cleanValue.slice(-1);
    setOtpValues(newOtpValues);

    const code = newOtpValues.join("");
    if (code.length === 6) {
      triggerVerify(code);
      return;
    }

    // Auto-focus next input
    if (index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle backspace/delete key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtpValues = [...otpValues];
      
      if (otpValues[index]) {
        // If current has value, just clear it
        newOtpValues[index] = "";
        setOtpValues(newOtpValues);
      } else if (index > 0) {
        // If current is empty, clear previous and focus it
        newOtpValues[index - 1] = "";
        setOtpValues(newOtpValues);
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().replace(/[^0-9]/g, "");
    if (pastedData.length === 6) {
      const newOtpValues = pastedData.split("");
      setOtpValues(newOtpValues);
      triggerVerify(pastedData);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border-0 shadow-lg p-4 w-100 position-relative" style={{ maxWidth: "420px", borderRadius: "16px" }}>
        
        {step === 2 && (
          <button 
            type="button" 
            className="btn btn-link position-absolute text-secondary p-0"
            onClick={() => {
              setStep(1);
              setOtpValues(Array(6).fill(""));
              setError(null);
            }}
            style={{ 
              zIndex: 10, 
              left: "24px", 
              top: "44px", 
              transform: "translateY(-50%)",
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}
            title="Back to Email"
          >
            <i className="bi bi-arrow-left fs-4"></i>
          </button>
        )}

        <div className="text-center mb-4">
          <i className="bi bi-intersect text-success fs-1"></i>
          <h2 className="fw-bold mt-2" style={{ fontSize: "1.6rem" }}>
            {step === 1 ? "Sign in to Virpa" : "Enter Verification Code"}
          </h2>
          <p className="text-secondary small">
            {step === 1 ? "Enter your email address to verify." : `We sent an OTP code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger small py-2 px-3 rounded-3 mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary x-small">Email address</label>
              <input 
                name="email"
                type="email" 
                className="form-control form-control-sm bg-light border-0 px-3 py-2" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@virpa.com" 
                style={{ height: "46px", borderRadius: "10px" }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
              style={{ height: "48px", borderRadius: "10px", fontSize: "16px" }}
            >
              {loading && <span className="spinner-border spinner-border-sm"></span>}
              <span>Send OTP Code</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary x-small mb-3 d-block text-center text-uppercase">
                6-Digit Security Code
              </label>
              
              <div className="d-flex justify-content-between gap-2 mb-4">
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onPaste={handlePaste}
                    className="form-control text-center fw-bold fs-4"
                    style={{
                      width: "48px",
                      height: "56px",
                      borderRadius: "12px",
                      backgroundColor: "#f8faf9",
                      border: "2px solid #e2e8f0",
                      transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#00A76F";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0, 167, 111, 0.15)";
                      e.target.style.backgroundColor = "#ffffff";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
                      e.target.style.backgroundColor = "#f8faf9";
                    }}
                  />
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-success w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 mb-3"
              disabled={loading}
              style={{ height: "48px", borderRadius: "10px", fontSize: "16px" }}
            >
              {loading && <span className="spinner-border spinner-border-sm"></span>}
              <span>Verify & Login</span>
            </button>
          </form>
        )}

        <div className="text-center mt-4 pt-3 border-top">
          <p className="small text-secondary mb-0">
            Don’t have an account? <Link href="/register" className="text-success fw-bold text-decoration-none">Get started</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
