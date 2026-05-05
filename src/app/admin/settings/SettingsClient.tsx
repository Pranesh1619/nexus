"use client";

import React, { useState } from "react";
import { updatePassword, deleteUserAccount } from "./actions";
import StatusModal from "@/components/StatusModal";
import { useRouter } from "next/navigation";

export default function SettingsClient({ userId }: { userId: string }) {
  const [showPassForm, setShowPassForm] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [delSuccess, setDelSuccess] = useState(false);
  const router = useRouter();

  async function handlePassSubmit(formData: FormData) {
    const res = await updatePassword(formData);
    if (res.success) {
      setPassSuccess(true);
      setShowPassForm(false);
    }
  }

  async function handleConfirmDelete() {
    const res = await deleteUserAccount(userId);
    if (res.success) {
      setDelSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  }

  return (
    <>
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body p-4">
          <h6 className="fw-bold mb-3 small uppercase text-secondary">Security Settings</h6>
          <p className="text-secondary x-small mb-4">Manage your password and authentication requirements.</p>
          
          {!showPassForm ? (
            <button 
              onClick={() => setShowPassForm(true)}
              className="btn btn-light border w-100 text-start d-flex justify-content-between align-items-center py-2 px-3 small fw-bold"
            >
              <span>Update Password</span>
              <i className="bi bi-chevron-right small text-secondary"></i>
            </button>
          ) : (
            <form action={handlePassSubmit} className="bg-light p-3 rounded-3 border">
              <input type="hidden" name="userId" value={userId} />
              <div className="mb-3">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-2">New Password</label>
                <input name="newPassword" type="password" className="form-control form-control-sm border-0 bg-white" placeholder="••••••••" required />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm px-4 fw-bold shadow-sm">Save Password</button>
                <button type="button" onClick={() => setShowPassForm(false)} className="btn btn-light btn-sm px-3 fw-bold border">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="card border-danger border-opacity-25 bg-danger bg-opacity-10 shadow-none">
        <div className="card-body p-4">
          <h6 className="fw-bold text-danger mb-2 small uppercase">Danger Zone</h6>
          <p className="x-small text-secondary mb-3">Deleting your account is permanent. All your data will be wiped.</p>
          <button 
            type="button"
            className="btn btn-outline-danger btn-sm fw-bold px-4"
            data-bs-toggle="modal" 
            data-bs-target="#confirmDeleteAccountModal"
          >
            Delete Account
          </button>
        </div>
      </div>

      <StatusModal 
        id="confirmDeleteAccountModal" 
        type="confirm" 
        title="Delete Account?" 
        message="Are you absolutely sure? This action cannot be undone and you will be logged out."
        onConfirm={handleConfirmDelete}
      />

      {passSuccess && (
        <StatusModal 
          id="passSuccessModal" 
          type="success" 
          title="Password Updated!" 
          message="Your security credentials have been successfully updated."
        />
      )}

      {delSuccess && (
        <StatusModal 
          id="delSuccessModal" 
          type="success" 
          title="Account Deleted" 
          message="Your account has been removed. Redirecting to login..."
        />
      )}
    </>
  );
}
