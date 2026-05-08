"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CallLog = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  status: string;
  stage: string;
  aiScore: number | null;
  notes: string | null;
  createdAt: Date;
  leadId: string;
  lead: {
    id: string;
    name: string;
    company: string | null;
  };
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: Date;
  calls: {
    id: string;
    stage: string;
    createdAt: Date;
  }[];
};

type Agent = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  leads: Lead[];
  calls: CallLog[];
};

interface AgentsWorkspaceProps {
  initialAgents: any[]; // will cast to Agent[]
}

export default function AgentsWorkspace({ initialAgents }: AgentsWorkspaceProps) {
  const agents = initialAgents as Agent[];
  const router = useRouter();

  // Always pre-select the first agent in the list
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || "");

  // Get currently selected agent details
  const selectedAgent = useMemo(() => {
    return agents.find((a) => a.id === selectedAgentId);
  }, [agents, selectedAgentId]);

  // Compute selected agent's statistics
  const stats = useMemo(() => {
    if (!selectedAgent) return null;

    const totalLeads = selectedAgent.leads.length;
    const totalCalls = selectedAgent.calls.length;
    const wonLeads = selectedAgent.leads.filter(
      (l) => l.status === "WON" || l.status === "CLOSED_WON"
    ).length;

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const totalDuration = selectedAgent.calls.reduce((acc, c) => acc + (c.duration || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    const leadStatusCounts = selectedAgent.leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLeads,
      totalCalls,
      wonLeads,
      conversionRate,
      avgDuration,
      leadStatusCounts,
    };
  }, [selectedAgent]);

  return (
    <div className="container-fluid p-0 animate-fade">
      {/* 1. Unified Top Selector & Agent Header Card (Swap Left Info & Right Dropdown Selection) */}
      <div className="card border-0 shadow-sm mb-4 bg-white p-4 rounded-4">
        <div className="row align-items-start g-4">
          
          {/* Selected Agent Details Bio (Left Column) */}
          {selectedAgent ? (
            <div className="col-md-7 col-12">
              <div className="d-flex align-items-start gap-3">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold text-uppercase shadow-sm flex-shrink-0 animate-bounce" style={{ width: "50px", height: "50px", fontSize: "18px" }}>
                  {selectedAgent.name.charAt(0)}
                </div>
                <div className="flex-grow-1">
                  {/* Line 1: Workspace Title */}
                  <h5 className="fw-bold mb-1 text-dark" style={{ fontSize: "18px" }}>
                    {selectedAgent.name} Workspace
                  </h5>
                  
                  {/* Line 2: Role, Email and Active status */}
                  <div className="text-secondary small d-flex flex-wrap align-items-center gap-2" style={{ fontSize: "12.5px" }}>
                    <span className="badge bg-light text-dark border px-2 py-0.5 small fw-normal">{selectedAgent.role}</span>
                    <span>•</span>
                    <span className="fw-medium">{selectedAgent.email}</span>
                    <span>•</span>
                    <span className="text-success fw-bold d-flex align-items-center gap-1">
                      <span className="bg-success rounded-circle animate-pulse" style={{ width: "6px", height: "6px", display: "inline-block" }}></span>
                      Active
                    </span>
                  </div>

                  {/* Line 3: Team Management Button explicitly below */}
                  <div className="mt-2.5" style={{ marginTop: "10px" }}>
                    <Link href={`/admin/users`} className="btn btn-sm btn-light border px-3 py-1.5 fw-semibold small d-inline-flex align-items-center gap-1.5" style={{ borderRadius: "8px", fontSize: "12.5px" }}>
                      <i className="bi bi-people"></i> Team Management
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="col-md-7 col-12">
              <h5 className="fw-bold mb-1 text-dark" style={{ fontSize: "18px" }}>No Representative Selected</h5>
            </div>
          )}

          {/* Dropdown Selector (Right Column - border on left for desktop) */}
          <div className="col-md-5 col-12 border-start-md border-light ps-md-4">
            <label className="form-label small fw-bold text-secondary text-uppercase tracking-wider mb-2" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
              <i className="bi bi-person-badge text-primary me-1"></i> Agent Selection
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="form-select border shadow-sm py-2.5 px-3"
              style={{ borderRadius: "10px", fontWeight: "600", fontSize: "15px", color: "#333" }}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.leads.length} Leads assigned)
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {selectedAgent ? (
        <div>
          {/* 2. Agent Live Stats KPI Area (Full Width Row) */}
          {stats && (
            <div className="row g-4 mb-4">
              {/* Card 1: Assigned Leads */}
              <div className="col-12 col-md-3">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-4 h-100 transition-all hover-shadow">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="text-secondary uppercase tracking-wider fw-bold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>ASSIGNED LEADS</span>
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                      <i className="bi bi-person-badge fs-6"></i>
                    </div>
                  </div>
                  <h2 className="fw-bold text-dark mb-1" style={{ fontSize: "28px" }}>{stats.totalLeads}</h2>
                  <p className="text-secondary x-small mb-0">Total lead profiles assigned</p>
                </div>
              </div>

              {/* Card 2: Total Calls */}
              <div className="col-12 col-md-3">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-4 h-100 transition-all hover-shadow">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="text-secondary uppercase tracking-wider fw-bold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>TOTAL CALLS</span>
                    <div className="bg-info bg-opacity-10 text-info rounded-circle d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                      <i className="bi bi-telephone-outbound fs-6"></i>
                    </div>
                  </div>
                  <h2 className="fw-bold text-info mb-1" style={{ fontSize: "28px" }}>{stats.totalCalls}</h2>
                  <p className="text-secondary x-small mb-0">Interactive call transcripts</p>
                </div>
              </div>

              {/* Card 3: Successful Deals */}
              <div className="col-12 col-md-3">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-4 h-100 transition-all hover-shadow">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="text-secondary uppercase tracking-wider fw-bold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>CLOSED WON</span>
                    <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                      <i className="bi bi-trophy fs-6"></i>
                    </div>
                  </div>
                  <h2 className="fw-bold text-success mb-1" style={{ fontSize: "28px" }}>{stats.wonLeads}</h2>
                  <p className="text-secondary x-small mb-0">Successfully closed deals</p>
                </div>
              </div>

              {/* Card 4: Conversion Rate */}
              <div className="col-12 col-md-3">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-4 h-100 transition-all hover-shadow">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="text-secondary uppercase tracking-wider fw-bold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>CONVERSION RATE</span>
                    <div className="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                      <i className="bi bi-graph-up-arrow fs-6"></i>
                    </div>
                  </div>
                  <h2 className="fw-bold text-warning mb-1" style={{ fontSize: "28px" }}>{stats.conversionRate}%</h2>
                  <p className="text-secondary x-small mb-0">Avg talk duration: <span className="fw-bold text-dark">{stats.avgDuration}s</span></p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Assigned Pipelines & Leads Table (Full Row Clickable) */}
          <div className="card border-0 shadow-sm mb-4 rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                  <i className="bi bi-person-workspace text-primary"></i>
                  <span>Assigned Pipelines & Leads</span>
                </h5>
                <p className="text-secondary x-small mb-0">Click any row to open that lead's full detail profile.</p>
              </div>
              <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2.5 py-1 small fw-bold">
                {selectedAgent.leads.length} Records
              </span>
            </div>
            
            <div className="card-body p-4 pt-2">
              {selectedAgent.leads.length === 0 ? (
                <div className="text-center py-5">
                  <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 56, height: 56 }}>
                    <i className="bi bi-person-slash text-secondary opacity-50 fs-4"></i>
                  </div>
                  <p className="text-secondary small mb-0">No assigned leads found for this agent.</p>
                  <Link href="/admin/sales" className="btn btn-sm btn-outline-primary mt-3 px-3 rounded-pill fw-bold">
                    <i className="bi bi-plus-lg me-1"></i>Assign Lead on Sales Floor
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="x-small text-secondary px-3 py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Full Name</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Company</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Status</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Source</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Phone</th>
                        <th className="x-small text-secondary text-end px-3 py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAgent.leads.map((lead) => (
                        <tr 
                          key={lead.id}
                          onClick={() => router.push(`/admin/leads/${lead.id}`)}
                          className="cursor-pointer"
                          style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                        >
                          <td className="px-3">
                            <div className="fw-bold text-dark text-decoration-none small d-flex align-items-center gap-2">
                              {/* <div className="bg-light rounded-circle d-flex align-items-center justify-content-center fw-bold text-secondary flex-shrink-0 shadow-sm" style={{ width: "30px", height: "30px", fontSize: "11px" }}>
                                {lead.name.charAt(0).toUpperCase()}
                              </div> */}
                              <span>{lead.name}</span>
                            </div>
                          </td>
                          <td className="small text-secondary">{lead.company || "—"}</td>
                          <td>
                            {(() => {
                              const isWon = lead.status === 'CLOSED_WON' || lead.status === 'WON';
                              const isLost = lead.status === 'CLOSED_LOST' || lead.status === 'LOST';
                              let pillBg = "rgba(0, 167, 111, 0.12)";
                              let pillColor = "#00a76f";
                              let displayStatus = lead.status;

                              if (isWon) {
                                pillBg = "rgba(255, 193, 7, 0.12)";
                                pillColor = "#ffc107";
                                displayStatus = "WON";
                              } else if (isLost) {
                                pillBg = "rgba(220, 53, 69, 0.12)";
                                pillColor = "#dc3545";
                                displayStatus = "LOST";
                              } else if (lead.status === "QUALIFIED" || lead.status === "Qualified") {
                                pillBg = "rgba(13, 110, 253, 0.12)";
                                pillColor = "#0d6efd";
                                displayStatus = "QUALIFIED";
                              } else if (lead.status === "CONTACTED" || lead.status === "Contacted") {
                                pillBg = "rgba(23, 162, 184, 0.12)";
                                pillColor = "#17a2b8";
                                displayStatus = "CONTACTED";
                              }

                              return (
                                <span className="badge rounded-pill px-2.5 py-1 fw-bold" style={{ backgroundColor: pillBg, color: pillColor, fontSize: "11px" }}>
                                  {displayStatus}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="small text-secondary">{lead.source || "COLD_CALL"}</td>
                          <td className="small text-secondary fw-semibold font-monospace">{lead.phone}</td>
                          <td className="text-end px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/leads/${lead.id}`);
                              }}
                              className="btn btn-sm btn-outline-primary py-1 px-3 x-small fw-bold hover-shadow"
                              style={{ borderRadius: "50px" }}
                            >
                              <i className="bi bi-eye me-1"></i>View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 4. Call logs & AI Analysis Table (Full Row Clickable) */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                  <i className="bi bi-telephone-outbound-fill text-info"></i>
                  <span>Interactive Call logs & Analysis</span>
                </h5>
                <p className="text-secondary x-small mb-0">Click any row to open that call's AI transcript and quality analysis.</p>
              </div>
              <span className="badge bg-info bg-opacity-10 text-info rounded-pill px-2.5 py-1 small fw-bold">
                {selectedAgent.calls.length} Interactions
              </span>
            </div>

            <div className="card-body p-4 pt-2">
              {selectedAgent.calls.length === 0 ? (
                <div className="text-center py-5">
                  <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 56, height: 56 }}>
                    <i className="bi bi-telephone-slash text-secondary opacity-50 fs-4"></i>
                  </div>
                  <p className="text-secondary small mb-0">No logged calls found for this agent.</p>
                  <Link href="/admin/calls" className="btn btn-sm btn-outline-info mt-3 px-3 rounded-pill fw-bold">
                    <i className="bi bi-telephone-plus me-1"></i>Log a Call
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="x-small text-secondary px-3 py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Date & Time</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Lead Contact</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Stage Reached</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold text-center" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>AI Quality Score</th>
                        <th className="x-small text-secondary py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Duration</th>
                        <th className="x-small text-secondary text-end px-3 py-3 text-uppercase fw-bold" style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAgent.calls.map((call) => (
                        <tr 
                          key={call.id}
                          onClick={() => router.push(`/admin/calls/${call.id}`)}
                          className="cursor-pointer"
                          style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                        >
                          <td className="px-3" style={{ padding: "12px 16px" }}>
                            <div className="d-flex flex-column text-secondary small">
                              <div className="text-dark fw-semibold" style={{ fontSize: "14px" }}>
                                {new Date(call.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-muted" style={{ fontSize: "11.5px", whiteSpace: "nowrap" }}>
                                {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="fw-bold text-primary small hover-underline">
                              {call.lead?.name || "Deleted Lead"}
                            </div>
                            <span className="d-block text-secondary" style={{ fontSize: "10.5px" }}>{call.lead?.company || "No Company"}</span>
                          </td>
                          <td className="small fw-bold text-dark">{call.stage}</td>
                          <td className="text-center">
                            <span className={`fw-bold small ${(call.aiScore || 0) > 70 ? 'text-success' : 'text-warning'}`} style={{ fontSize: "14px" }}>
                              {call.aiScore || 0}%
                            </span>
                          </td>
                          <td className="small text-secondary font-monospace">{call.duration ? `${call.duration}s` : "0s"}</td>
                          <td className="text-end px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/calls/${call.id}`);
                              }}
                              className="btn btn-sm btn-outline-primary py-1.5 px-3.5 x-small fw-bold hover-shadow d-inline-flex align-items-center"
                              style={{ borderRadius: "50px" }}
                            >
                              <i className="bi bi-eye" style={{ marginRight: "8px" }}></i>View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm p-5 text-center bg-white rounded-4">
          <i className="bi bi-people fs-1 text-muted mb-3 animate-pulse"></i>
          <h5 className="fw-bold text-dark">No Active Agents Found</h5>
          <p className="text-secondary small mb-0">There are currently no agents registered or active in the database system.</p>
        </div>
      )}
    </div>
  );
}
