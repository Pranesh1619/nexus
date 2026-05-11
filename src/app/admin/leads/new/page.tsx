"use client";

import React, { useTransition } from "react";
import { createLead } from "../actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewLeadPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createLead(formData);
        router.push("/admin/leads");
        router.refresh();
      } catch (err) {
        console.error("Failed to create lead:", err);
      }
    });
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/leads" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-arrow-left me-1 x-small"></i> <span className="x-small fw-bold uppercase">Back to Leads</span>
        </Link>
        <h3 className="fw-bold mb-1">Add New Lead</h3>
        <p className="text-secondary x-small">Enter the details of the potential customer.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2 animate-pulse" placeholder="e.g. John Doe" required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Phone Number</label>
                <input name="phone" type="tel" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="+1 234 567 890" required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="john@example.com" />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Company Name</label>
                <input name="company" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="Virpa Solutions" />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Source</label>
                <select name="source" className="form-select form-select-sm bg-light border-0 small px-3 py-2">
                  <option value="WEBSITE">Website</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="COLD_CALL">Cold Call</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                </select>
              </div>
            </div>
            <div className="d-grid d-md-flex justify-content-md-end mt-4 pt-3 border-top">
              <button type="submit" disabled={isPending} className="btn btn-primary px-5 py-2 small fw-bold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: "#00a76f", borderColor: "#00a76f" }}>
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Creating...</span>
                  </>
                ) : (
                  "Create New Lead"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Saving Overlay Modal */}
      {isPending && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{ 
            zIndex: 1060, 
            backgroundColor: "rgba(15, 23, 42, 0.45)", 
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease"
          }}
        >
          <div 
            className="card border-0 shadow-lg p-4 w-100 mx-3 text-center bg-white animate-scale" 
            style={{ maxWidth: "400px", borderRadius: "20px" }}
          >
            <div className="py-4">
              <div className="spinner-border text-success mb-3" role="status" style={{ width: "3.5rem", height: "3.5rem" }}>
                <span className="visually-hidden">Creating...</span>
              </div>
              <h4 className="fw-bold text-dark mb-1">Creating Lead...</h4>
              <p className="text-secondary small mt-1 mb-0">Please wait while lead is being provisioned in the queue.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
