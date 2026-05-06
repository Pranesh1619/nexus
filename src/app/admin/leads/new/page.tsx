import React from "react";
import { createLead } from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function NewLeadPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    await createLead(formData);
    redirect("/admin/leads");
  }

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
          <form action={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small" placeholder="e.g. John Doe" required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Phone Number</label>
                <input name="phone" type="tel" className="form-control form-control-sm bg-light border-0 small" placeholder="+1 234 567 890" required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small" placeholder="john@example.com" />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Company Name</label>
                <input name="company" type="text" className="form-control form-control-sm bg-light border-0 small" placeholder="Virpa Solutions" />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Source</label>
                <select name="source" className="form-select form-select-sm bg-light border-0 small">
                  <option value="WEBSITE">Website</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="COLD_CALL">Cold Call</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                </select>
              </div>
            </div>
            <div className="d-grid d-md-flex justify-content-md-end mt-4 pt-3 border-top">
              <button type="submit" className="btn btn-primary px-5 py-2 small fw-bold shadow-sm">Create New Lead</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
