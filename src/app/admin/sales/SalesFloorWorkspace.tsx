"use client";

import React, { useState, useTransition, useMemo, useRef } from "react";
import { assignLeadToUser } from "./actions";

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: string;
  assignedTo: string | null;
};

interface SalesFloorWorkspaceProps {
  agents: User[];
  leads: Lead[];
}

export default function SalesFloorWorkspace({ agents, leads }: SalesFloorWorkspaceProps) {
  const [isPending, startTransition] = useTransition();
  const agentsContainerRef = useRef<HTMLDivElement>(null);

  const scrollAgents = (direction: "left" | "right") => {
    if (agentsContainerRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      agentsContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null); // "unassigned" or agent.id

  // Local client state for instant, blistering-fast responsive Drag & Drop (Optimistic UI)
  const [leadsState, setLeadsState] = useState<Lead[]>(leads);
  const [prevLeads, setPrevLeads] = useState<Lead[]>(leads);

  if (leads !== prevLeads) {
    setLeadsState(leads);
    setPrevLeads(leads);
  }

  // Dropdown-driven lead assignment state variables (highly mobile/touch responsive)
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState<Lead | null>(null);
  const [selectedTargetAgentId, setSelectedTargetAgentId] = useState<string>("");

  const handleOpenAssignModal = (lead: Lead) => {
    setSelectedLeadForAssign(lead);
    setSelectedTargetAgentId(lead.assignedTo || "");
  };

  const handleConfirmAssignment = async () => {
    if (!selectedLeadForAssign) return;
    const targetUserId = selectedTargetAgentId === "" ? null : selectedTargetAgentId;
    
    // Instantly reflect assignment optimistically
    setLeadsState(prev => prev.map(l => l.id === selectedLeadForAssign.id ? { ...l, assignedTo: targetUserId } : l));

    startTransition(async () => {
      try {
        await assignLeadToUser(selectedLeadForAssign.id, targetUserId);
      } catch (error) {
        console.error("Failed to assign:", error);
        setLeadsState(leads); // Rollback on failure
      } finally {
        setSelectedLeadForAssign(null);
      }
    });
  };

  const handleUnassignLead = async (leadId: string) => {
    // Instantly reflect unassignment optimistically
    setLeadsState(prev => prev.map(l => l.id === leadId ? { ...l, assignedTo: null } : l));

    startTransition(async () => {
      try {
        await assignLeadToUser(leadId, null);
      } catch (error) {
        console.error("Failed to unassign:", error);
        setLeadsState(leads); // Rollback on failure
      }
    });
  };

  // Client-Side Search Filters for high scale (1000+ records)
  const [agentSearch, setAgentSearch] = useState("");
  const [unassignedLeadsSearch, setUnassignedLeadsSearch] = useState("");


  // 1. Memoized calculation of unassigned pool
  const unassignedLeads = useMemo(() => {
    return leadsState.filter(l => !l.assignedTo);
  }, [leadsState]);

  // 2. Memoized filtered unassigned leads
  const filteredUnassignedLeads = useMemo(() => {
    if (!unassignedLeadsSearch) return unassignedLeads;
    const q = unassignedLeadsSearch.toLowerCase();
    return unassignedLeads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.company || "").toLowerCase().includes(q) ||
      l.phone.includes(q)
    );
  }, [unassignedLeads, unassignedLeadsSearch]);

  // 3. Memoized active sales agents filtered by search
  const filteredAgents = useMemo(() => {
    if (!agentSearch) return agents;
    const q = agentSearch.toLowerCase();
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(q) ||
      agent.email.toLowerCase().includes(q)
    );
  }, [agents, agentSearch]);

  // Drag and drop mechanics
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (activeDropTarget !== targetId) {
      setActiveDropTarget(targetId);
    }
  };

  const handleDragLeave = () => {
    setActiveDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetUserId: string | null) => {
    e.preventDefault();
    setActiveDropTarget(null);
    const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;

    if (!leadId) return;

    // Instantly update client-side state optimistically for responsive drag-and-drop feedback!
    setLeadsState(prev => prev.map(l => l.id === leadId ? { ...l, assignedTo: targetUserId } : l));

    // Immediately trigger drop re-assignment
    startTransition(async () => {
      try {
        await assignLeadToUser(leadId, targetUserId);
      } catch (error) {
        console.error("Failed to assign lead:", error);
        setLeadsState(leads); // Rollback on error
      } finally {
        setDraggedLeadId(null);
      }
    });
  };

  return (
    <div className="w-100">
      {/* Sales Floor Dashboard Stats */}
      <div className="row g-4 mb-4">
        {/* Card 1: Unassigned Pool */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: "16px" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-secondary x-small fw-bold uppercase text-uppercase tracking-wider" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>Unassigned Pool</span>
                <h2 className="fw-bold text-dark mb-0 mt-1" style={{ fontSize: "32px", letterSpacing: "-1px" }}>
                  {unassignedLeads.length}
                </h2>
              </div>
              <div className="bg-light rounded-circle p-2.5 text-secondary d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }}>
                <i className="bi bi-person-dash fs-5"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Sales Agents */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: "16px" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-secondary x-small fw-bold uppercase text-uppercase tracking-wider" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>Active Sales Agents</span>
                <h2 className="fw-bold text-primary mb-0 mt-1" style={{ fontSize: "32px", letterSpacing: "-1px" }}>
                  {agents.length}
                </h2>
              </div>
              <div className="bg-opacity-10 rounded-circle p-2.5 text-primary d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }}>
                <i className="bi bi-people fs-5"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Overall Assigned */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: "16px" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-secondary x-small fw-bold uppercase text-uppercase tracking-wider" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>Overall Assigned</span>
                <h2 className="fw-bold text-success mb-0 mt-1" style={{ fontSize: "32px", letterSpacing: "-1px" }}>
                  {leadsState.filter(l => l.assignedTo).length}
                </h2>
              </div>
              <div className="bg-success bg-opacity-10 rounded-circle p-2.5 text-success d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }}>
                <i className="bi bi-person-check fs-5"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPending && (
        <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-4 shadow-sm border-0 animate-fade" style={{ borderRadius: "10px" }}>
          <span className="spinner-border spinner-border-sm"></span>
          <span>Saving pipeline assignment changes...</span>
        </div>
      )}

      {/* 2. Dual Heading and Aligned Search Bars */}
      <div className="row g-4 mb-4 align-items-end mt-4">
        {/* Left Side Header: Leads Pool */}
        <div className="col-lg-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h4 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-funnel text-secondary"></i>
              <span>Leads Pool</span>
            </h4>
            <span className="badge bg-secondary rounded-pill px-2.5 py-1 small fw-bold">{filteredUnassignedLeads.length}</span>
          </div>
          <div className="search-box w-100 m-0 d-none d-md-flex" style={{ height: "42px" }}>
            <i className="bi bi-search text-secondary"></i>
            <input
              type="text"
              placeholder="Search pool leads..."
              value={unassignedLeadsSearch}
              onChange={(e) => setUnassignedLeadsSearch(e.target.value)}
              className="w-100"
            />
          </div>
        </div>

        {/* Right Side Header: Sales Users */}
        <div className="col-lg-8">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h4 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-people text-primary"></i>
              <span>Sales Users</span>
            </h4>
            <span className="text-secondary small fw-bold d-flex align-items-center gap-2">
              <span>{filteredAgents.length} Active Agents</span>
              <span className="d-flex gap-1 ms-1">
                <button
                  type="button"
                  onClick={() => scrollAgents("left")}
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0 hover-shadow"
                  style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ddd" }}
                  title="Scroll Left"
                >
                  <i className="bi bi-chevron-left" style={{ fontSize: "11px" }}></i>
                </button>
                <button
                  type="button"
                  onClick={() => scrollAgents("right")}
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0 hover-shadow"
                  style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ddd" }}
                  title="Scroll Right"
                >
                  <i className="bi bi-chevron-right" style={{ fontSize: "11px" }}></i>
                </button>
              </span>
            </span>
          </div>
          <div className="search-box w-100 m-0 d-none d-md-flex" style={{ height: "42px" }}>
            <i className="bi bi-search text-secondary"></i>
            <input
              type="text"
              placeholder="Search sales agents by name or email..."
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              className="w-100"
            />
          </div>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="row g-4 align-items-stretch">

        {/* Column 1: Unassigned Pool */}
        <div className="col-lg-4 mb-4 mb-lg-0">
          <div
            className="card border-0 shadow-sm d-flex flex-column"
            style={{
              borderRadius: "16px",
              backgroundColor: activeDropTarget === "unassigned" ? "rgba(220, 53, 69, 0.05)" : "#f8f9fa",
              border: activeDropTarget === "unassigned" ? "2px dashed #dc3545" : "2px solid transparent",
              transition: "all 0.25s ease-in-out",
              height: "630px"
            }}
            onDragOver={(e) => handleDragOver(e, "unassigned")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            <div className="card-header bg-transparent border-0 pt-4 px-4 pb-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <span>Unassigned Pool</span>
                  {isPending && (
                    <span className="spinner-border spinner-border-sm text-secondary" style={{ width: "13px", height: "13px" }} role="status"></span>
                  )}
                </h5>
                <p className="text-secondary x-small mb-0">Drag leads here to unassign them</p>
              </div>
            </div>

            <div className="card-body p-3 overflow-auto" style={{ height: "540px", overflowY: "auto" }}>
              <div className="d-flex flex-column gap-3">
                {filteredUnassignedLeads.length === 0 ? (
                  <div className="text-center py-5 text-secondary small border-3 border-dashed rounded-3 p-4 bg-white bg-opacity-50">
                    <i className="bi bi-check-circle fs-2 text-success d-block mb-2 animate-bounce"></i>
                    No unassigned leads found.
                  </div>
                ) : (
                  filteredUnassignedLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`card shadow-sm p-3 bg-white cursor-grab position-relative transition-all ${draggedLeadId === lead.id ? "border border-primary" : "border-0"}`}
                      style={{
                        borderRadius: "12px",
                        cursor: "grab",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease"
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="badge bg-secondary bg-opacity-10 text-secondary x-small rounded-pill px-2 py-0.5">{lead.status}</span>
                        <i className="bi bi-grip-vertical text-muted fs-5 cursor-grab"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">{lead.name}</h6>
                      <div className="text-secondary x-small d-flex align-items-center gap-1 mb-1">
                        <i className="bi bi-building"></i>
                        <span>{lead.company || "No Company"}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-1">
                        <div className="text-muted x-small d-flex align-items-center gap-1">
                          <i className="bi bi-telephone"></i>
                          <span>{lead.phone}</span>
                        </div>
                        <div className="dropdown">
                          <button 
                            className="btn p-0 border-0 text-secondary bg-transparent" 
                            type="button" 
                            data-bs-toggle="dropdown" 
                            aria-expanded="false"
                            style={{ width: "auto", height: "auto", padding: "4px !important" }}
                          >
                            <i className="bi bi-three-dots-vertical" style={{ fontSize: "14px" }}></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end shadow border-0" style={{ minWidth: "160px", fontSize: "13px" }}>
                            <li>
                              <button 
                                className="dropdown-item py-2 d-flex align-items-center gap-2"
                                onClick={() => handleOpenAssignModal(lead)}
                              >
                                <i className="bi bi-person-check text-success"></i>
                                <span>Move / Assign</span>
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 & 3: Active Sales Agents Columns (Horizontal Scroll with exactly two columns per row) */}
        <div className="col-lg-8">
          <div
            ref={agentsContainerRef}
            className="d-flex flex-row flex-nowrap overflow-auto pb-2"
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              gap: "1.5rem",
              scrollbarWidth: "thin",
              paddingBottom: "10px"
            }}
          >
            {filteredAgents.length === 0 ? (
              <div className="w-100">
                <div className="card border-0 shadow-sm p-5 text-center bg-white" style={{ borderRadius: "16px" }}>
                  <i className="bi bi-people fs-1 text-muted mb-3"></i>
                  <h5 className="fw-bold text-dark">No Agents Found</h5>
                  <p className="text-secondary small mb-0">{"No sales agents matched your current search query \""}{agentSearch}{"\"."}</p>
                </div>
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const agentLeads = leadsState.filter(l => l.assignedTo === agent.id);
                const searchVal = "";
                const filteredAgentLeads = agentLeads.filter(lead =>
                  lead.name.toLowerCase().includes(searchVal.toLowerCase()) ||
                  (lead.company || "").toLowerCase().includes(searchVal.toLowerCase()) ||
                  lead.phone.includes(searchVal)
                );
                const isTargetingThis = activeDropTarget === agent.id;

                return (
                  <div
                    key={agent.id}
                    style={{
                      minWidth: "calc(50% - 0.75rem)",
                      maxWidth: "calc(50% - 0.75rem)",
                      flex: "0 0 calc(50% - 0.75rem)"
                    }}
                  >
                    <div
                      className="card border-0 shadow-sm d-flex flex-column"
                      style={{
                        borderRadius: "16px",
                        backgroundColor: isTargetingThis ? "rgba(40, 167, 69, 0.05)" : "#ffffff",
                        border: isTargetingThis ? "2px dashed #28a745" : "2px solid transparent",
                        boxShadow: isTargetingThis ? "0 10px 25px rgba(40, 167, 69, 0.12)" : "",
                        transition: "all 0.25s ease-in-out",
                        height: "630px"
                      }}
                      onDragOver={(e) => handleDragOver(e, agent.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, agent.id)}
                    >
                      <div className="card-header bg-transparent border-0 pt-4 px-4 pb-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                          <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: "42px", height: "42px" }}>
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                              <span>{agent.name}</span>
                              {isPending && (
                                <span className="spinner-border spinner-border-sm text-success" style={{ width: "13px", height: "13px" }} role="status"></span>
                              )}
                            </h6>
                            <span className="text-secondary x-small" style={{ fontSize: "11px" }}>{agent.email}</span>
                          </div>
                        </div>
                        <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-2.5 py-1 small fw-bold">
                          {filteredAgentLeads.length} Assigned
                        </span>
                      </div>

                      <div className="card-body p-3 d-flex flex-column" style={{ height: "540px", overflowY: "auto", backgroundColor: "#fdfdfd" }}>
                        {filteredAgentLeads.length === 0 ? (
                          <div className="text-center py-5 text-secondary small border-2 border-dashed rounded-3 p-4 bg-white bg-opacity-80 m-2 d-flex flex-column align-items-center justify-content-center flex-grow-1" style={{ minHeight: "420px" }}>
                            <i className="bi bi-box-arrow-in-down fs-1 text-muted d-block mb-3 animate-pulse"></i>
                            <span className="fw-bold text-dark fs-6">Drag & Drop Leads</span>
                            <span className="text-muted small mt-1 px-3">Assign leads to {agent.name.split(" ")[0]} easily by dropping them here.</span>
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-3 flex-grow-1">
                            {filteredAgentLeads.map(lead => (
                              <div
                                key={lead.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, lead.id)}
                                className={`card shadow-sm p-3 bg-white cursor-grab position-relative hover-shadow ${draggedLeadId === lead.id ? "border border-primary" : "border-light border"}`}
                                style={{
                                  borderRadius: "12px",
                                  cursor: "grab",
                                  transition: "all 0.2s"
                                }}
                              >
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <span className={`badge x-small rounded-pill px-2.5 py-0.5 ${lead.status === 'CLOSED_WON' || lead.status === 'WON' ? 'bg-success bg-opacity-10 text-success' :
                                      lead.status === 'CLOSED_LOST' || lead.status === 'LOST' ? 'bg-danger bg-opacity-10 text-danger' :
                                        'bg-warning bg-opacity-10 text-warning'
                                    }`}>{lead.status}</span>
                                  <i className="bi bi-grip-vertical text-muted fs-5 cursor-grab"></i>
                                </div>
                                <h6 className="fw-bold text-dark mb-1">{lead.name}</h6>
                                <div className="text-secondary x-small d-flex align-items-center gap-1 mb-1">
                                  <i className="bi bi-building"></i>
                                  <span>{lead.company || "No Company"}</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mt-1">
                                  <div className="text-muted x-small d-flex align-items-center gap-1">
                                    <i className="bi bi-telephone"></i>
                                    <span>{lead.phone}</span>
                                  </div>
                                  <div className="dropdown">
                                    <button 
                                      className="btn p-0 border-0 text-secondary bg-transparent" 
                                      type="button" 
                                      data-bs-toggle="dropdown" 
                                      aria-expanded="false"
                                      style={{ width: "auto", height: "auto", padding: "4px" }}
                                    >
                                      <i className="bi bi-three-dots-vertical" style={{ fontSize: "14px",  }}></i>
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end shadow border-0" style={{ minWidth: "160px", fontSize: "13px" }}>
                                      <li>
                                        <button 
                                          className="dropdown-item py-2 d-flex align-items-center gap-2"
                                          onClick={() => handleOpenAssignModal(lead)}
                                        >
                                          <i className="bi bi-person-check text-success"></i>
                                          <span>Move / Re-assign</span>
                                        </button>
                                      </li>
                                      <li>
                                        <button 
                                          className="dropdown-item py-2 d-flex align-items-center gap-2 text-danger"
                                          onClick={() => handleUnassignLead(lead.id)}
                                        >
                                          <i className="bi bi-x-circle text-danger"></i>
                                          <span>Remove (Unassign)</span>
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Client-Side Assignment Modal */}
      {selectedLeadForAssign && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade" 
          style={{ 
            zIndex: 9999, 
            backgroundColor: "rgba(15, 23, 42, 0.4)", 
            backdropFilter: "blur(4px)" 
          }}
        >
          <div className="card border-0 shadow-lg p-4 bg-white" style={{ maxWidth: "420px", width: "90%", borderRadius: "16px" }}>
            <div className="text-center mb-3">
              <div className="rounded-circle bg-opacity-10 text-primary d-flex align-items-center justify-content-center mx-auto mb-2" style={{ width: 56, height: 56 }}>
                <i className="bi bi-person-check fs-3"></i>
              </div>
              <h5 className="fw-bold mb-1">Assign Representative</h5>
              <p className="text-secondary small">{"Route "}<strong>{selectedLeadForAssign.name}</strong>{" to an active representative's pipeline."}</p>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary text-uppercase mb-1">Active Sales Agent</label>
              <select 
                value={selectedTargetAgentId}
                onChange={(e) => setSelectedTargetAgentId(e.target.value)}
                className="form-select border"
                style={{ borderRadius: "8px", fontWeight: "600" }}
              >
                <option value="">Unassigned (General Pool)</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                ))}
              </select>
            </div>

            <div className="d-flex gap-2">
              <button 
                onClick={() => setSelectedLeadForAssign(null)}
                className="btn btn-light border w-100 py-2 small fw-bold"
                style={{ borderRadius: "10px" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAssignment}
                className="btn btn-primary w-100 py-2 small fw-bold text-white"
                style={{ borderRadius: "10px" }}
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
