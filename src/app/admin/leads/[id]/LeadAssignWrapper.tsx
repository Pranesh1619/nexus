"use client";

import React, { useState, useTransition } from "react";
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
}

export default function LeadAssignWrapper({ leadId, currentAssignedTo, agents }: LeadAssignWrapperProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAssignedTo || "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

  return (
    <>
      <button 
        onClick={() => setShowModal(true)} 
        className="btn btn-primary d-flex align-items-center gap-2 px-3 py-1.5 small fw-bold"
      >
        <i className="bi bi-person-plus-fill"></i>
        <span>Assign Lead</span>
      </button>

      {showModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{ 
            zIndex: 1050, 
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
                className="form-select bg-light border-0 small px-3 py-2.5"
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
                className="btn btn-primary px-4 py-2 small fw-bold d-flex align-items-center gap-2"
                style={{ borderRadius: "10px" }}
                disabled={isPending}
                onClick={handleAssign}
              >
                {isPending && <span className="spinner-border spinner-border-sm" role="status"></span>}
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Progress Loading Overlay */}
      {isPending && !showModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 animate-fade" 
          style={{ zIndex: 1060 }}
        >
          <div className="card p-4 border-0 shadow-lg text-center bg-white" style={{ maxWidth: "400px", borderRadius: "16px" }}>
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="fw-bold text-dark mb-1">Assigning Lead...</h5>
            <p className="text-secondary small mb-0 px-2">Re-routing agent logs and establishing exclusive contact assignment.</p>
          </div>
        </div>
      )}
    </>
  );
}
