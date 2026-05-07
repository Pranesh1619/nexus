"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom"; // Teleport modal directly to document.body
import { assignLeadToUser } from "../../sales/actions";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface LeadAssignWrapperProps {
  leadId: string;
  currentAssignedTo: string | null;
  agents: Agent[];
  mode?: "button" | "card";
  assignedAgentName?: string;
}

export default function LeadAssignWrapper({ leadId, currentAssignedTo, agents, mode = "button", assignedAgentName }: LeadAssignWrapperProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAssignedTo || "");
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Safely handle client-side rendering to prevent server-side hydration mismatches during portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAssign = () => {
    startTransition(async () => {
      try {
        const targetId = selectedAgentId === "" ? null : selectedAgentId;
        await assignLeadToUser(leadId, targetId);
        setShowModal(false);
        router.refresh();
      } catch (error) {
        console.error("Failed to assign lead:", error);
      }
    });
  };

  const triggerElement = mode === "button" ? (
    <button 
      onClick={() => setShowModal(true)} 
      className="btn btn-primary d-flex align-items-center gap-2 px-3 py-1.5 small fw-bold"
    >
      <i className="bi bi-person-plus-fill"></i>
      <span>Assign Lead</span>
    </button>
  ) : (
    <div 
      onClick={() => setShowModal(true)}
      className="p-2 px-3 bg-light rounded-3 transition-all hover-shadow" 
      style={{ cursor: "pointer" }}
      title="Click to assign or change agent"
    >
      <label className="form-label mb-1" style={{ cursor: "pointer" }}>Assigned Agent</label>
      <div className="fw-bold text-success small d-flex align-items-center gap-1.5">
        <i className="bi bi-person-badge-fill text-success animate-pulse"></i>
        <span>{assignedAgentName || "Unassigned"}</span>
        <i className="bi bi-pencil-square text-secondary x-small ms-auto" style={{ fontSize: "11px" }}></i>
      </div>
    </div>
  );

  // Fallback to plain trigger markup during server rendering
  if (!mounted) {
    return triggerElement;
  }

  return (
    <>
      {triggerElement}

      {/* Teleport Modal markup to document.body for absolute full screen overlay */}
      {showModal && createPortal(
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{ 
            zIndex: 99999, 
            backgroundColor: "rgba(15, 23, 42, 0.45)", 
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease"
          }}
        >
          <div 
            className="card border-0 shadow-lg p-4 w-100 mx-3 text-center bg-white" 
            style={{ maxWidth: "420px", borderRadius: "20px" }}
          >
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "60px", height: "60px" }}>
              <i className="bi bi-person-badge fs-3"></i>
            </div>
            
            <h4 className="fw-bold text-dark mb-2">Assign Representative</h4>
            <p className="text-secondary small mb-4">
              Select an active sales agent to manage this lead and route conversation records.
            </p>

            <div className="mb-4 text-start">
              <label className="form-label text-secondary fw-bold small uppercase mb-2">Active Sales Agent</label>
              <select 
                className="form-select bg-light border-1 small px-3 py-2.5"
                style={{ borderRadius: "10px", fontSize: "14px" }}
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                disabled={isPending}
              >
                <option value="">Unassigned (Return to general pool)</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex gap-3 justify-content-center">
              <button 
                type="button" 
                className="btn btn-light px-4 py-2 small fw-bold text-secondary"
                style={{ borderRadius: "10px" }}
                disabled={isPending}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary px-4 py-2 small fw-bold d-flex align-items-center gap-2 text-white"
                style={{ borderRadius: "10px" }}
                disabled={isPending}
                onClick={handleAssign}
              >
                {isPending && <span className="spinner-border spinner-border-sm text-white" role="status"></span>}
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Teleport Loading Overlay to document.body */}
      {isPending && !showModal && createPortal(
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 animate-fade" 
          style={{ zIndex: 999999 }}
        >
          <div className="card p-4 border-0 shadow-lg text-center bg-white" style={{ maxWidth: "400px", borderRadius: "16px" }}>
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="fw-bold text-dark mb-1">Assigning Lead...</h5>
            <p className="text-secondary small mb-0 px-2">Re-routing agent logs and establishing exclusive contact assignment.</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
