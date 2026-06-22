"use client";

import React, { useState } from "react";
import { updateUserInfo } from "./actions";
import StatusModal from "@/components/StatusModal";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string | null;
}

export default function ProfileClient({ user }: { user: ProfileUser }) {
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    const res = await updateUserInfo(formData);
    if (res.success) {
      setSuccess(true);
    }
  }

  return (
    <>
      <form action={handleSubmit}>
        <input type="hidden" name="userId" value={user.id} />
        
        <div className="row g-3">
          <div className="col-md-12">
            <label className="form-label">Full Display Name</label>
            <input 
              name="name" 
              type="text" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2 small" 
              defaultValue={user.name} 
              required 
            />
          </div>

          <div className="col-md-12">
            <label className="form-label">Professional Email Address</label>
            <input 
              name="email" 
              type="email" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2 small" 
              defaultValue={user.email} 
              required 
            />
          </div>

          <div className="col-md-12">
            <label className="form-label">Mobile Phone Number (for Click-to-Call)</label>
            <input 
              name="phone" 
              type="tel" 
              className="form-control form-control-sm bg-light border-0 px-3 py-2 small" 
              defaultValue={user.phone || ""} 
              placeholder="e.g. +14155552671"
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Assigned Role</label>
            <select name="role" className="form-select form-select-sm bg-light border-0 px-3 py-2 small" defaultValue={user.role}>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SALES">SALES</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Floor Status</label>
            <select name="status" className="form-select form-select-sm bg-light border-0 px-3 py-2 small" defaultValue={user.status}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        <div className="mt-5 pt-4 border-top d-flex justify-content-end gap-2">
          <button type="submit" className="btn btn-primary px-4 py-2 small fw-bold shadow-sm">Save Profile Changes</button>
        </div>
      </form>

      {success && (
        <StatusModal 
          id="profileSuccessModal" 
          type="success" 
          title="Profile Updated!" 
          message="Your personal information has been successfully saved."
        />
      )}
    </>
  );
}
