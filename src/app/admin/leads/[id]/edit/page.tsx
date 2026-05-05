import React from "react";
import { getLeadById, updateLead } from "../../actions";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import StatusModal from "@/components/StatusModal";

export default async function EditLeadPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ success?: string }> }) {
  const { id } = await params;
  const { success } = await searchParams;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    await updateLead(id, formData);
    redirect(`/admin/leads/${id}/edit?success=true`);
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/leads" className="btn btn-link text-secondary text-decoration-none p-0 mb-2">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Leads</span>
        </Link>
        <div className="d-flex align-items-center gap-2">
          {/* <Link href={`/admin/leads/${id}`} className="text-secondary text-decoration-none">
            <i className="bi bi-arrow-left-circle fs-4"></i>
          </Link> */}
          <h3 className="fw-bold mb-0">Edit Lead: {lead.name}</h3>
        </div>
        <p className="text-secondary x-small mt-1">Update information for this specific record.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.name} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone Number</label>
                <input name="phone" type="tel" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.phone} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.email || ''} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Company Name</label>
                <input name="company" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={lead.company || ''} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
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
                <label className="form-label">Source</label>
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
              <button type="submit" className="btn btn-primary px-4 py-2 small fw-bold shadow-sm">Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      {success && (
        <StatusModal 
          id="editSuccessModal" 
          type="success" 
          title="Lead Updated!" 
          message="The lead information has been successfully updated."
        />
      )}
    </div>
  );
}
