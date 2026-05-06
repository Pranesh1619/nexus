import React from "react";
import { getUserById, deleteUser } from "../actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UserDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  async function handleDelete() {
    "use server";
    await deleteUser(id);
    redirect("/admin/users");
  }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/admin/users" className="btn btn-link text-secondary text-decoration-none p-0 mb-2">
            <i className="bi bi-arrow-left me-1"></i> Back to Users
          </Link>
          <h2 className="fw-bold mb-1">{user.name}</h2>
          <p className="text-secondary small">Detailed profile and activity for this user.</p>
        </div>
        <div className="d-flex gap-2">
          <Link href={`/admin/users/${id}/edit`} className="btn btn-light border">
            <i className="bi bi-pencil-square me-2"></i> Edit Profile
          </Link>
          <form action={handleDelete}>
            <button type="submit" className="btn btn-danger">
              <i className="bi bi-trash me-2"></i> Delete User
            </button>
          </form>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4 text-center">
              <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 80, height: 80, fontSize: 32 }}>
                {user.name.charAt(0)}
              </div>
              <h5 className="fw-bold mb-1">{user.name}</h5>
              <div className="text-secondary small mb-3">{user.email}</div>
              <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-info bg-opacity-10 text-info'} mb-0`}>
                {user.role}
              </span>
            </div>
            <div className="card-footer bg-white border-0 p-4 pt-0">
              <hr className="mt-0 opacity-50" />
              <div className="mb-3">
                <label className="text-secondary small fw-bold uppercase d-block mb-1">Status</label>
                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1">
                  {user.status || 'Active'}
                </span>
              </div>
              <div className="mb-0">
                <label className="text-secondary small fw-bold uppercase d-block mb-1">Joined On</label>
                <div className="text-secondary small">{new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">User Performance</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 text-center">
                    <div className="text-secondary x-small fw-bold uppercase mb-1">Total Calls</div>
                    <div className="h4 fw-bold mb-0">0</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 text-center">
                    <div className="text-secondary x-small fw-bold uppercase mb-1">Success Rate</div>
                    <div className="h4 fw-bold mb-0">0%</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 text-center">
                    <div className="text-secondary x-small fw-bold uppercase mb-1">Leads Managed</div>
                    <div className="h4 fw-bold mb-0">0</div>
                  </div>
                </div>
              </div>
              <div className="text-center py-5 mt-4">
                <i className="bi bi-bar-chart text-light fs-1 mb-3 d-block"></i>
                <p className="text-secondary small">No performance data available yet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
