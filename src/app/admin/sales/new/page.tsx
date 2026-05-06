import React from "react";
import { createSalesPerson } from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function NewAgentPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    await createSalesPerson(formData);
    redirect("/admin/sales");
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/sales" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Team</span>
        </Link>
        <h3 className="fw-bold mb-1">Add New Sales Agent</h3>
        <p className="text-secondary x-small">Onboard a new representative to the sales floor.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="e.g. Michael Scott" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Work Email</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="michael@virpa.com" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Initial Password</label>
                <input name="password" type="password" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="••••••••" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Role Type</label>
                <input type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" value="SALES AGENT" disabled />
              </div>
            </div>
            <div className="d-grid d-md-flex justify-content-md-end mt-4 pt-3 border-top">
              <button type="submit" className="btn btn-primary px-5 py-2 small fw-bold shadow-sm">Complete Onboarding</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
