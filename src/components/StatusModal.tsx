"use client";

import React from "react";

interface StatusModalProps {
  id: string;
  type: "success" | "error" | "warning" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function StatusModal({ id, type, title, message, onConfirm }: StatusModalProps) {
  const iconMap = {
    success: "bi-check-circle-fill text-success",
    error: "bi-exclamation-octagon-fill text-danger",
    warning: "bi-exclamation-triangle-fill text-warning",
    confirm: "bi-question-circle-fill text-primary"
  };

  return (
    <div className="modal fade" id={id} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-body p-5 text-center">
            <div className="mb-4">
              <i className={`bi ${iconMap[type]} display-1`}></i>
            </div>
            <h3 className="fw-bold mb-2">{title}</h3>
            <p className="text-secondary mb-4">{message}</p>
            
            <div className="d-flex justify-content-center gap-2">
              {type === "confirm" ? (
                <>
                  <button type="button" className="btn btn-light px-4 border" data-bs-dismiss="modal">Cancel</button>
                  <button 
                    type="button" 
                    className="btn btn-primary px-4" 
                    data-bs-dismiss="modal"
                    onClick={onConfirm}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary px-5 py-2 fw-bold" data-bs-dismiss="modal">
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
