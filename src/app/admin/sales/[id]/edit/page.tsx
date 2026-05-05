import React from "react";
import { getUserById, updateUser } from "../../actions";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import StatusModal from "@/components/StatusModal";

export default async function EditAgentPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ success?: string }> }) {
  const { id } = await params;
  const { success } = await searchParams;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    await updateUser(id, formData);
    redirect(`/admin/sales/${id}/edit?success=true`);
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/sales" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Team</span>
        </Link>
        <h3 className="fw-bold mb-1">Edit Sales Representative: {user.name}</h3>
        <p className="text-secondary x-small mt-1">Update agent credentials and floor status.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Agent Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={user.name} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Corporate Email</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={user.email} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Floor Status</label>
                <select name="status" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={user.status || 'Active'}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Away">Away</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <Link href="/admin/sales" className="btn btn-light border-0 px-3 py-2 small">Cancel</Link>
              <button type="submit" className="btn btn-primary px-4 py-2 small fw-bold shadow-sm">Update Agent Profile</button>
            </div>
          </form>
        </div>
      </div>

      {success && (
        <StatusModal 
          id="agentSuccessModal" 
          type="success" 
          title="Agent Updated!" 
          message="The sales representative's profile has been successfully updated."
        />
      )}
    </div>
  );
}
