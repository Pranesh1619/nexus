"use client";

import React, { useState, useTransition } from "react";
import { updateLead } from "../../actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
}

export default function EditLeadForm({ lead, id }: { lead: Lead; id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await updateLead(id, formData);
        router.push("/admin/leads");
        router.refresh();
      } catch (err) {
        console.error("Failed to update lead:", err);
      }
    });
  };

  return (
    <div className="w-100">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.name} required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Phone Number</label>
                <input name="phone" type="tel" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.phone} required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.email || ''} />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Company Name</label>
                <input name="company" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.company || ''} />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Status</label>
                <select name="status" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={lead.status}>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="NEGOTIATION">Negotiation</option>
                  <option value="CLOSED_WON">Closed Won</option>
                  <option value="CLOSED_LOST">Closed Lost</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Source</label>
                <select name="source" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={lead.source || undefined}>
                  <option value="WEBSITE">Website</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="COLD_CALL">Cold Call</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <Link href={`/admin/leads/${id}`} className="btn btn-light border-0 px-3 py-2 small">Cancel</Link>
              <button type="submit" disabled={isPending} className="btn btn-primary px-4 py-2 small fw-bold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: "#00a76f", borderColor: "#00a76f" }}>
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Changes"
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
                <span className="visually-hidden">Saving...</span>
              </div>
              <h4 className="fw-bold text-dark mb-1">Saving Changes...</h4>
              <p className="text-secondary small mt-1 mb-0">Updating lead record and syncing logs.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
