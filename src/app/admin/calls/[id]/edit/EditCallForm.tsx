"use client";

import React, { useTransition } from "react";
import { updateCallDocumentation } from "../../actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Call {
  id: string;
  status: string;
  aiScore: number | null;
  stage: string;
  notes: string | null;
}

export default function EditCallForm({ call, id }: { call: Call; id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateCallDocumentation(id, formData);
        router.push(`/admin/calls/${id}`);
        router.refresh();
      } catch (err) {
        console.error("Failed to update call documentation:", err);
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
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Connection Status</label>
                <select name="status" className="form-select form-select-sm bg-light border-0 small px-3" style={{ height: '40px' }} defaultValue={call.status}>
                  <option value="CONNECTED">Connected</option>
                  <option value="MISSED">Missed</option>
                  <option value="VOICEMAIL">Voicemail</option>
                  <option value="BUSY">Busy</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Manual AI Quality Override (%)</label>
                <input name="aiScore" type="number" min="0" max="100" className="form-control form-control-sm bg-light border-0 small px-3" style={{ height: '40px' }} defaultValue={call.aiScore || 0} />
              </div>
              <div className="col-md-12">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Lead Progression Stage</label>
                <select name="stage" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={call.stage}>
                  <option value="New Lead">New Lead</option>
                  <option value="Attempted Contact">Attempted Contact</option>
                  <option value="Connected">Connected</option>
                  <option value="Enquiry">Enquiry</option>
                  <option value="Engaged">Engaged</option>
                  <option value="Interested">Interested</option>
                  <option value="Desire">Desire</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Follow-up Needed">Follow-up Needed</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="col-md-12">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Professional Agent Observations</label>
                <textarea name="notes" className="form-control form-control-sm bg-light border-0 small px-3 py-2" rows={5} defaultValue={call.notes || ""} placeholder="Document key takeaways, objections, and next steps..."></textarea>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <Link href={`/admin/calls/${id}`} className="btn btn-light border-0 px-3 py-2 small">Cancel</Link>
              <button type="submit" disabled={isPending} className="btn btn-primary px-4 py-2 small fw-bold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: "#00a76f", borderColor: "#00a76f" }}>
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Documentation"
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
              <h4 className="fw-bold text-dark mb-1">Saving Documentation...</h4>
              <p className="text-secondary small mt-1 mb-0">Analyzing conversation details and updating agent records.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
