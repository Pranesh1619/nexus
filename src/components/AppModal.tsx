"use client";

import React from "react";

interface AppModalProps {
  id: string;
  type: "creating" | "updating" | "success" | "failure" | "confirm";
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function AppModal({ id, type, title, message, onConfirm, onCancel }: AppModalProps) {
  return (
    <div 
      className="modal fade" 
      id={id} 
      tabIndex={-1} 
      aria-hidden="true" 
      data-bs-backdrop={["creating", "updating"].includes(type) ? "static" : undefined} 
      data-bs-keyboard={!["creating", "updating"].includes(type)}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "16px" }}>
          <div className="modal-body p-5 text-center">
            
            {type === "creating" && (
              <div className="py-4">
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="fw-bold mt-2">Creating Record</h4>
                <p className="text-secondary small mb-0">Please wait while we persist your details to the database...</p>
              </div>
            )}
            
            {type === "updating" && (
              <div className="py-4">
                <div className="spinner-border text-info mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="fw-bold mt-2">Updating Record</h4>
                <p className="text-secondary small mb-0">Synchronizing modifications to Supabase database server...</p>
              </div>
            )}
            
            {type === "success" && (
              <div>
                <div className="mb-4 text-success">
                  <i className="bi bi-check-circle-fill display-3"></i>
                </div>
                <h4 className="fw-bold mb-2">{title || "Operation Successful!"}</h4>
                <p className="text-secondary mb-4">{message || "The action has been processed successfully."}</p>
                <button type="button" className="btn btn-success px-5 py-2 rounded-2 fw-semibold" data-bs-dismiss="modal">
                  Done
                </button>
              </div>
            )}
            
            {type === "failure" && (
              <div>
                <div className="mb-4 text-danger">
                  <i className="bi bi-exclamation-octagon-fill display-3"></i>
                </div>
                <h4 className="fw-bold mb-2">{title || "Operation Failed"}</h4>
                <p className="text-secondary mb-4">{message || "There was an error completing your request. Please try again."}</p>
                <button type="button" className="btn btn-danger px-5 py-2 rounded-2 fw-semibold" data-bs-dismiss="modal">
                  Dismiss
                </button>
              </div>
            )}
            
            {type === "confirm" && (
              <div>
                <div className="mb-4 text-warning">
                  <i className="bi bi-question-circle-fill display-3"></i>
                </div>
                <h4 className="fw-bold mb-2">{title || "Are you sure?"}</h4>
                <p className="text-secondary mb-4">{message || "This action cannot be undone."}</p>
                <div className="d-flex justify-content-center gap-2">
                  <button type="button" className="btn btn-light px-4 border rounded-2" data-bs-dismiss="modal" onClick={onCancel}>Cancel</button>
                  <button type="button" className="btn btn-primary px-4 rounded-2" data-bs-dismiss="modal" onClick={onConfirm}>Confirm</button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
