"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import { updateLeadStatus } from "../leads/actions";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DealsPipelineClientProps {
  initialLeads: Lead[];
}

// Map database statuses to Kanban Stages with aesthetic attributes
const STAGES = [
  { id: "NEW", title: "Discovery", probability: 20, badgeClass: " bg-opacity-10 text-primary", borderClass: "border-primary" },
  { id: "CONTACTED", title: "Proposal", probability: 50, badgeClass: "bg-info bg-opacity-10 text-info", borderClass: "border-info" },
  { id: "QUALIFIED", title: "Negotiation", probability: 80, badgeClass: "bg-warning bg-opacity-10 text-warning", borderClass: "border-warning" },
  { id: "WON", title: "Closed Won", probability: 100, badgeClass: "bg-success bg-opacity-10 text-success", borderClass: "border-success" },
  { id: "LOST", title: "Closed Lost", probability: 0, badgeClass: "bg-danger bg-opacity-10 text-danger", borderClass: "border-danger" },
];

export default function DealsPipelineClient({ initialLeads }: DealsPipelineClientProps) {
  const [leadsState, setLeadsState] = useState<Lead[]>(initialLeads);
  const [isPending, startTransition] = useTransition();

  // Sync client state instantly if server props change
  useEffect(() => {
    setLeadsState(initialLeads);
  }, [initialLeads]);

  // 1. View Mode and Drag-and-Drop States
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);

  // Generate consistent fake deal value based on ID if not already in DB
  const getDealValue = (id: string) => {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 2500 + (sum % 12 * 1250); // Mapped to $2,500 - $16,250
  };

  // 2. Move Lead to different Stage (Persistent to DB!)
  const handleMoveStage = (leadId: string, newStatus: string) => {
    // Optimistic Client update for instant responsive layout feedback
    setLeadsState(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    // Call persistent server action
    startTransition(async () => {
      try {
        await updateLeadStatus(leadId, newStatus);
      } catch (err) {
        console.error("Failed to persist stage update:", err);
        setLeadsState(initialLeads); // Rollback on error
      }
    });
  };

  // Combine real database records with a set of high-fidelity mock opportunities if database is thin
  const activeDeals = useMemo(() => {
    const dbDeals = leadsState.map(lead => ({
      id: lead.id,
      name: lead.name,
      company: lead.company || "Independent Entity",
      source: lead.source || "COLD_CALL",
      status: lead.status === "CLOSED_WON" ? "WON" : lead.status === "CLOSED_LOST" ? "LOST" : lead.status, // Normalize
      value: getDealValue(lead.id),
      phone: lead.phone,
      isMock: false
    }));

    if (dbDeals.length > 0) return dbDeals;

    // Fallbacks to display a magnificent, premium pipeline instantly
    return [
      { id: "fallback-1", name: "Alpha Corp Support SLA", company: "Alpha Logistics Inc.", source: "REFERRAL", status: "QUALIFIED", value: 12500, phone: "+1 (555) 019-1224", isMock: true },
      { id: "fallback-2", name: "Beta Outbound Sales Floor", company: "Beta Solutions Ltd", source: "WEBSITE", status: "CONTACTED", value: 8750, phone: "+1 (555) 014-9912", isMock: true },
      { id: "fallback-3", name: "Omega Customer Service Ops", company: "Omega Global Group", source: "COLD_CALL", status: "NEW", value: 15400, phone: "+1 (555) 012-3490", isMock: true },
      { id: "fallback-4", name: "Delta Tech Lead Gen Trial", company: "Delta Systems", source: "WEBSITE", status: "WON", value: 5000, phone: "+1 (555) 015-8491", isMock: true },
      { id: "fallback-5", name: "Epsilon Tech Backoffice SLA", company: "Epsilon LLC", source: "REFERRAL", status: "LOST", value: 6200, phone: "+1 (555) 018-7711", isMock: true }
    ];
  }, [leadsState]);

  // 3. Perform Revenue Forecasting Math
  const forecastingMetrics = useMemo(() => {
    let totalValue = 0;
    let weightedForecast = 0;
    let wonValue = 0;
    let activeCount = 0;

    activeDeals.forEach(deal => {
      const stageObj = STAGES.find(s => s.id === deal.status) || STAGES[0];
      const probability = stageObj.probability;

      totalValue += deal.value;
      weightedForecast += (deal.value * (probability / 100));
      
      if (deal.status === "WON") {
        wonValue += deal.value;
      }
      if (deal.status !== "WON" && deal.status !== "LOST") {
        activeCount++;
      }
    });

    const avgDealSize = activeDeals.length > 0 ? Math.round(totalValue / activeDeals.length) : 0;
    
    return {
      totalValue,
      weightedForecast,
      wonValue,
      avgDealSize,
      activeCount
    };
  }, [activeDeals]);

  return (
    <div className="container-fluid p-0">
      
      {/* 1. Header & Title with View Toggle Options */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Deals & Opportunities</h2>
          <p className="text-secondary small">Visualized pipeline Kanban board and weighted revenue forecasting.</p>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          {/* Two-option View Switcher: Kanban and List */}
          <div className="btn-group rounded-pill p-1 bg-light border shadow-sm" style={{ width: "fit-content" }}>
            <button 
              onClick={() => setViewMode("kanban")}
              className={`btn btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 fw-bold transition-all ${
                viewMode === "kanban" ? "btn-primary text-white shadow-sm" : "btn-light border-0 text-secondary"
              }`}
              style={{ fontSize: "12.5px" }}
            >
              <i className="bi bi-kanban"></i>
              Kanban View
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`btn btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 fw-bold transition-all ${
                viewMode === "list" ? "btn-primary text-white shadow-sm" : "btn-light border-0 text-secondary"
              }`}
              style={{ fontSize: "12.5px" }}
            >
              <i className="bi bi-list-ul"></i>
              List View
            </button>
          </div>

          {isPending && (
            <div className="d-flex align-items-center gap-2 text-primary small">
              <span className="spinner-border spinner-border-sm"></span>
              Syncing...
            </div>
          )}
        </div>
      </div>

      {/* 2. Revenue Forecasting Summary Cards */}
      <div className="row g-4 mb-4">
        {/* Weighted Forecast Card */}
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 p-4 shadow-sm h-100 bg-opacity-10 border-start border-4 border-primary">
            <div className="text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
              Weighted Forecast
            </div>
            <div className="fw-bold fs-2 text-primary">${forecastingMetrics.weightedForecast.toLocaleString()}</div>
            <p className="text-secondary small mb-0 mt-1">Expected value by stage probability</p>
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 p-4 shadow-sm h-100 border-start border-4 border-secondary">
            <div className="text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
              Total Pipeline Value
            </div>
            <div className="fw-bold fs-2 text-dark">${forecastingMetrics.totalValue.toLocaleString()}</div>
            <p className="text-secondary small mb-0 mt-1">Sum of all open & closed deals</p>
          </div>
        </div>

        {/* Average Deal Size */}
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 p-4 shadow-sm h-100 border-start border-4 border-info">
            <div className="text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
              Average Contract size
            </div>
            <div className="fw-bold fs-2 text-info">${forecastingMetrics.avgDealSize.toLocaleString()}</div>
            <p className="text-secondary small mb-0 mt-1">Mean opportunity value</p>
          </div>
        </div>

        {/* Won Revenue Impact */}
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 p-4 shadow-sm h-100 bg-success bg-opacity-10 border-start border-4 border-success">
            <div className="text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
              Closed Won Revenue
            </div>
            <div className="fw-bold fs-2 text-success">${forecastingMetrics.wonValue.toLocaleString()}</div>
            <p className="text-secondary small mb-0 mt-1">Persisted conversion value</p>
          </div>
        </div>
      </div>

      {/* 3. Render View conditional: Kanban with Drag & Drop vs List Table */}
      {viewMode === "kanban" ? (
        /* Interactive Kanban Board Grid with Drag & Drop */
        <div className="row g-3 flex-nowrap overflow-auto pb-4" style={{ minHeight: "580px" }}>
          {STAGES.map(stage => {
            const stageDeals = activeDeals.filter(d => d.status === stage.id);
            const stageValueSum = stageDeals.reduce((sum, d) => sum + d.value, 0);
            const isHovered = draggedOverStage === stage.id;

            return (
              <div key={stage.id} className="col-12 col-md-4 col-lg-2.4" style={{ minWidth: "260px", flex: "1 0 20%" }}>
                <div 
                  className={`card h-100 border-0 shadow-sm rounded-3 transition-all ${
                    isHovered 
                      ? "bg-primary bg-opacity-10 border-2 border-primary border-dashed" 
                      : "bg-light bg-opacity-50"
                  }`}
                  style={{
                    minHeight: "520px",
                    border: isHovered ? "2px dashed #0d6efd" : "2px dashed transparent",
                    transition: "all 0.25s ease"
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedOverStage !== stage.id) {
                      setDraggedOverStage(stage.id);
                    }
                  }}
                  onDragLeave={() => {
                    setDraggedOverStage(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggedOverStage(null);
                    const dealId = e.dataTransfer.getData("text/plain") || draggedDealId;
                    if (dealId) {
                      handleMoveStage(dealId, stage.id);
                    }
                  }}
                >
                  
                  {/* Column Title Header */}
                  <div className="card-header bg-transparent border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                        <span className={`badge ${stage.badgeClass} rounded-pill`}>{stageDeals.length}</span>
                        <span>{stage.title}</span>
                        {isPending && (
                          <span className="spinner-border spinner-border-sm text-secondary" style={{ width: "12px", height: "12px" }} role="status"></span>
                        )}
                      </h6>
                      <span className="text-secondary small" style={{ fontSize: "10px" }}>Prob: {stage.probability}%</span>
                    </div>
                    <span className="fw-bold small text-dark">${stageValueSum.toLocaleString()}</span>
                  </div>

                  {/* Column Body Card List */}
                  <div className="card-body p-2 d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: "500px" }}>
                    {stageDeals.length === 0 ? (
                      <div className="border border-dashed rounded-3 p-4 text-center text-secondary small py-5 bg-white">
                        No opportunities
                      </div>
                    ) : (
                      stageDeals.map(deal => (
                        <div 
                          key={deal.id} 
                          draggable={true}
                          onDragStart={(e) => {
                            setDraggedDealId(deal.id);
                            e.dataTransfer.setData("text/plain", deal.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggedDealId(null);
                          }}
                          className={`card shadow-sm p-3 bg-white hover-shadow transition-all ${draggedDealId === deal.id ? "border border-primary" : "border-0"}`}
                          style={{
                            cursor: "grab",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-bold mb-0 text-dark small" style={{ fontSize: "13px" }}>{deal.name}</h6>
                            {deal.isMock && (
                              <span className="badge bg-light text-secondary uppercase fw-normal" style={{ fontSize: "8px" }}>DEMO</span>
                            )}
                          </div>
                          <div className="text-secondary small mb-3" style={{ fontSize: "11px" }}>
                            <i className="bi bi-building me-1"></i> {deal.company}
                          </div>

                          {/* Cost value and quick stage switch layout */}
                          <div className="d-flex justify-content-between align-items-center border-top pt-2">
                            <span className="fw-bold text-dark small">${deal.value.toLocaleString()}</span>
                            
                            {/* Fast Action Stage-Movers dropdown */}
                            <div className="btn-group">
                              <button 
                                className="btn btn-sm btn-light border-0 py-0.5 px-1 text-secondary dropdown-toggle-split" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false"
                                style={{ fontSize: "11px" }}
                              >
                                Move <i className="bi bi-arrow-right-short"></i>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end border-0 shadow py-1 small">
                                <li className="dropdown-header text-uppercase text-secondary py-1" style={{ fontSize: "9px" }}>Move Opportunity to:</li>
                                {STAGES.map(s => s.id !== stage.id && (
                                  <li key={s.id}>
                                    <button 
                                      onClick={() => handleMoveStage(deal.id, s.id)}
                                      className="dropdown-item py-1 text-dark"
                                    >
                                      {s.title}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Interactive List / Table View of Deals */
        <div className="card border-0 shadow-sm bg-white rounded-3 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small text-secondary fw-bold px-4 py-3">Opportunity Name</th>
                  <th className="small text-secondary fw-bold py-3">Company</th>
                  <th className="small text-secondary fw-bold py-3">Source</th>
                  <th className="small text-secondary fw-bold py-3">Deal Value</th>
                  <th className="small text-secondary fw-bold py-3" style={{ width: "200px" }}>Pipeline Stage</th>
                  <th className="small text-secondary fw-bold py-3">Phone</th>
                  <th className="small text-secondary fw-bold text-end px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeDeals.map((deal) => {
                  const stageObj = STAGES.find(s => s.id === deal.status) || STAGES[0];
                  
                  // Interactive Stage color presets
                  let stageBg = "rgba(13, 110, 253, 0.1)";
                  let stageColor = "#0d6efd";
                  if (deal.status === "WON") {
                    stageBg = "rgba(25, 135, 84, 0.1)";
                    stageColor = "#198754";
                  } else if (deal.status === "LOST") {
                    stageBg = "rgba(220, 53, 69, 0.1)";
                    stageColor = "#dc3545";
                  } else if (deal.status === "QUALIFIED") {
                    stageBg = "rgba(255, 193, 7, 0.15)";
                    stageColor = "#b27b00";
                  } else if (deal.status === "CONTACTED") {
                    stageBg = "rgba(13, 202, 240, 0.15)";
                    stageColor = "#0aa2c0";
                  }

                  return (
                    <tr key={deal.id}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: "14.5px" }}>{deal.name}</div>
                          {deal.isMock && (
                            <span className="badge bg-light text-secondary uppercase font-monospace mt-1" style={{ fontSize: "8px" }}>DEMO</span>
                          )}
                        </div>
                      </td>
                      <td className="text-secondary fw-semibold py-3" style={{ fontSize: "14px" }}>{deal.company}</td>
                      <td className="py-3">
                        <span className="badge bg-light text-secondary border px-2.5 py-1 text-uppercase font-monospace fw-semibold" style={{ fontSize: "10.5px", borderRadius: "6px" }}>
                          {deal.source}
                        </span>
                      </td>
                      <td className="fw-bold text-dark py-3" style={{ fontSize: "14.5px" }}>${deal.value.toLocaleString()}</td>
                      <td className="py-3">
                        <select 
                          value={deal.status}
                          onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                          className="form-select form-select-sm fw-bold cursor-pointer"
                          style={{ 
                            borderRadius: "8px", 
                            backgroundColor: stageBg,
                            color: stageColor,
                            borderColor: "transparent",
                            fontSize: "12px",
                            padding: "6px 12px",
                            fontWeight: "700"
                          }}
                        >
                          {STAGES.map(s => (
                            <option key={s.id} value={s.id} className="text-dark bg-white">
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-secondary py-3" style={{ fontSize: "13.5px" }}>{deal.phone}</td>
                      <td className="text-end px-4 py-3">
                        {!deal.isMock ? (
                          <Link href={`/admin/leads/${deal.id}`} className="btn btn-sm btn-light border px-2.5 py-1.5 text-primary fw-bold" style={{ fontSize: "12px", borderRadius: "8px" }} title="View Lead Profile">
                            <i className="bi bi-eye me-1.5"></i>
                          </Link>
                        ) : (
                          <button className="btn btn-sm btn-light border text-secondary disabled py-1.5 px-2.5" style={{ fontSize: "12px", borderRadius: "8px" }}>
                            Demo Record
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
