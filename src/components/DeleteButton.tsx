"use client";

import React, { useState } from "react";

interface DeleteButtonProps {
  id: string;
  onDelete: () => Promise<void>;
  label?: string;
  className?: string;
  title?: string;
  message?: string;
}

export default function DeleteButton({ 
  onDelete, 
  label = "Delete", 
  className = "btn btn-light border text-danger px-3 py-1 small",
  title = "Confirm Delete?",
  message = "Are you sure you want to delete this record? This action cannot be undone."
}: DeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    } finally {
      // On success, the parent router pushes/redirects so no need to clear isDeleting
    }
  };

  return (
    <>
      <button 
        type="button" 
        className={className}
        onClick={() => setShowConfirm(true)}
      >
        <i className="bi bi-trash me-2"></i> {label}
      </button>

      {/* 100% React State-Driven Delete Confirmation Modal Overlay */}
      {showConfirm && (
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
            style={{ maxWidth: "420px", borderRadius: "20px" }}
          >
            {isDeleting ? (
              <div className="py-4">
                <div className="spinner-border text-danger mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="fw-bold text-dark mb-0">Deleting Record...</h5>
                <p className="text-secondary small mt-1 mb-0">Please wait while database is updating.</p>
              </div>
            ) : (
              <>
                <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "60px", height: "60px" }}>
                  <i className="bi bi-exclamation-triangle fs-3"></i>
                </div>
                
                <h4 className="fw-bold text-dark mb-2">{title}</h4>
                <p className="text-secondary small mb-4">{message}</p>

                <div className="d-flex gap-3 justify-content-center">
                  <button 
                    type="button" 
                    className="btn btn-light px-4 py-2 small fw-bold text-secondary"
                    style={{ borderRadius: "10px" }}
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger px-4 py-2 small fw-bold"
                    style={{ borderRadius: "10px" }}
                    onClick={handleDelete}
                  >
                    Yes, Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
