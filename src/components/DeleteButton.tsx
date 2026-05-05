"use client";

import React from "react";
import StatusModal from "./StatusModal";

interface DeleteButtonProps {
  id: string;
  onDelete: () => Promise<void>;
  label?: string;
  className?: string;
  title?: string;
  message?: string;
}

export default function DeleteButton({ 
  id, 
  onDelete, 
  label = "Delete", 
  className = "btn btn-light border text-danger px-3 py-1 small",
  title = "Confirm Delete?",
  message = "Are you sure you want to delete this record? This action cannot be undone."
}: DeleteButtonProps) {
  const modalId = `confirmDeleteModal_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <>
      <button 
        type="button" 
        className={className}
        data-bs-toggle="modal" 
        data-bs-target={`#${modalId}`}
      >
        <i className="bi bi-trash me-2"></i> {label}
      </button>

      <StatusModal 
        id={modalId} 
        type="confirm" 
        title={title} 
        message={message}
        onConfirm={onDelete}
      />
    </>
  );
}
