import React from "react";
import { getUserById, updateUser } from "../../actions";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import StatusModal from "@/components/StatusModal";

export default async function EditUserPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ success?: string }> }) {
  const { id } = await params;
  const { success } = await searchParams;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    await updateUser(id, formData);
    redirect(`/admin/users/${id}/edit?success=true`);
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/users" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Users</span>
        </Link>
        <div className="d-flex align-items-center gap-2">
          <h3 className="fw-bold mb-0">Edit User: {user.name}</h3>
        </div>
        <p className="text-secondary x-small mt-1">Manage access roles and personal information.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={user.name} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" defaultValue={user.email} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Access Role</label>
                <select name="role" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={user.role}>
                  <option value="SALES">Sales Agent</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Account Status</label>
                <select name="status" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={user.status || 'Active'}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <Link href="/admin/users" className="btn btn-light border-0 px-3 py-2 small">Cancel</Link>
              <button type="submit" className="btn btn-primary px-4 py-2 small fw-bold shadow-sm">Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      {success && (
        <StatusModal 
          id="userSuccessModal" 
          type="success" 
          title="User Updated!" 
          message="The user profile has been successfully updated."
        />
      )}
    </div>
  );
}
