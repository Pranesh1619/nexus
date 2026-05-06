"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import StatusModal from "@/components/StatusModal";
import { deleteCallLog } from "./actions";

// Consistent scoring logic for the list view
function getDisplayScore(log: any) {
  if (log.aiScore && log.aiScore > 0) return log.aiScore;

  // Dynamic fallback based on stage if score not in DB
  const stages = [
    "New Lead", "Attempted Contact", "Connected", "Enquiry", "Engaged",
    "Interested", "Desire", "Qualified", "Follow-up Needed", "Closed"
  ];
  const idx = stages.indexOf(log.stage);
  if (idx === -1) return 85;
  return Math.floor(50 + (idx / 9) * 40 + 5);
}

// Maps status and stage to beautiful BPO Call Outcomes
function getCallOutcome(status: string, stage: string, leadStatus?: string) {
  if (stage === "Closed") {
    if (leadStatus === "LOST" || leadStatus === "CLOSED_LOST") {
      return { label: "Deal Lost", class: "bg-danger bg-opacity-10 text-danger border border-danger border-opacity-10" };
    }
    return { label: "Deal Won", class: "bg-success bg-opacity-10 text-success border border-success border-opacity-10" };
  }
  if (status === "MISSED") return { label: "Missed", class: "bg-danger bg-opacity-10 text-danger border border-danger border-opacity-10" };
  if (["Interested", "Qualified"].includes(stage)) return { label: "Lead Qualified", class: "bg-success bg-opacity-10 text-success" };
  if (stage === "Follow-up Needed") return { label: "Call Back Scheduled", class: "bg-warning bg-opacity-10 text-warning" };
  if (["Enquiry", "Attempted Contact"].includes(stage)) return { label: "Voicemail / busy", class: "bg-light text-secondary border" };
  return { label: "Contact Successful", class: "bg-opacity-10 text-primary" };
}

export default function CallList({ logs }: { logs: any[] }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "missed" | "connected" | "converted">("all");

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCallLog(deleteId);
      setDeleteId(null);
    }
  };

  // Helper to format talk time
  const formatDuration = (secs: number | null) => {
    if (!secs) return "0s";
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return mins > 0 ? `${mins}m ${remaining}s` : `${remaining}s`;
  };

  // Process and filter the call list based on selected tab and search query
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search query
      const matchesSearch =
        log.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.lead.phone.includes(searchTerm) ||
        log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.stage.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filters
      if (selectedFilter === "missed") {
        return log.status === "MISSED";
      }
      if (selectedFilter === "connected") {
        return log.status === "CONNECTED";
      }
      if (selectedFilter === "converted") {
        return log.stage === "Closed" || log.stage === "Qualified" || log.stage === "Interested";
      }

      return true;
    });
  }, [logs, searchTerm, selectedFilter]);

  return (
    <div className="d-flex flex-column gap-3">

      {/* 1. Header Filter & Search controls */}
      <div className="card border-0 shadow-sm p-3 bg-white" style={{ overflow: "hidden" }}>
        <div className="d-flex align-items-center justify-content-between gap-3 flex-nowrap" style={{ overflowX: "auto", width: "100%" }}>

          {/* Left Side: Search & Labeled Dropdown */}
          <div className="d-flex align-items-center gap-3 flex-shrink-0">
            <div className="search-box m-0" style={{ width: "280px" }}>
              <i className="bi bi-search text-secondary"></i>
              <input
                type="text"
                placeholder="Search call logs, agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              <label className="text-secondary fw-semibold small mb-0 flex-shrink-0" htmlFor="callStatusSelect">Call Status:</label>
              <select
                id="callStatusSelect"
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="form-select form-select-sm border cursor-pointer"
                style={{ width: "150px", borderRadius: "50px", height: "36px", paddingLeft: "15px", paddingRight: "30px", fontWeight: "600" }}
              >
                <option value="all">All Calls</option>
                <option value="missed">Missed</option>
                <option value="connected">Connected</option>
                <option value="converted">Converted</option>
              </select>
            </div>
          </div>

          <div className="text-end flex-shrink-0">
            <span className="text-secondary small">
              Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> log entries
            </span>
          </div>

        </div>
      </div>

      {/* 2. List Table */}
      <div className="card border-0 shadow-sm bg-white">

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>S.No</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Date</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Customer</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Agent</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Duration</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>AI Score</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Outcome</th>
                <th className="border-0 small text-secondary text-end" style={{ padding: "12px 16px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-5 text-center text-secondary small">
                    No matching call history found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const displayScore = getDisplayScore(log);
                  const outcome = getCallOutcome(log.status, log.stage, log.lead.status);
                  
                  // Color for AI Score matching standard colors
                  let scoreColor = "text-success";
                  if (displayScore < 85) scoreColor = "text-warning";
                  if (displayScore < 75) scoreColor = "text-danger";

                  return (
                    <tr key={log.id}>
                      <td className="small text-secondary" style={{ padding: "12px 16px" }}>{index + 1}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="d-flex flex-column text-secondary small">
                          <div className="text-secondary" style={{ fontSize: "14px" }}>{new Date(log.createdAt).toLocaleDateString()}</div>
                          <div className="text-muted" style={{ fontSize: "11.5px", whiteSpace: "nowrap" }} >
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{log.lead.name}</div>
                          <div className="text-secondary" style={{ fontSize: "11.5px", whiteSpace: "nowrap" }}>{log.lead.phone}</div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>{log.user.name}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="text-secondary" style={{ fontSize: "14px" }}>
                          {log.status === "MISSED" ? "—" : formatDuration(log.duration)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {log.status === "CONNECTED" ? (
                          <span className={`fw-bold ${scoreColor}`} style={{ fontSize: "14px" }}>
                            {displayScore}%
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className={`badge ${outcome.class} rounded-pill px-2.5 py-1.5 fw-bold`} style={{ fontSize: "11px" }}>
                          {outcome.label}
                        </span>
                      </td>
                      <td className="text-end" style={{ padding: "12px 16px" }}>
                        <div className="d-flex justify-content-end align-items-center gap-2">
                          <Link href={`/admin/calls/${log.id}`} className="btn btn-sm btn-light border-0 text-primary" title="View Analysis">
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link href={`/admin/calls/${log.id}/edit`} className="btn btn-sm btn-light border-0 text-info" title="Edit Log">
                            <i className="bi bi-pencil-square"></i>
                          </Link>
                          <button
                            onClick={() => setDeleteId(log.id)}
                            className="btn btn-sm btn-light border-0 text-danger"
                            title="Delete Log"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 100% React State-Driven Delete Confirmation Modal */}
      {deleteId && (
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
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "60px", height: "60px" }}>
              <i className="bi bi-exclamation-triangle fs-3"></i>
            </div>
            
            <h4 className="fw-bold text-dark mb-2">Delete Call Log?</h4>
            <p className="text-secondary small mb-4">
              Are you sure you want to delete this call log? This action is permanent and will completely delete the recording, transcription, and audit scoring.
            </p>

            <div className="d-flex gap-3 justify-content-center">
              <button 
                type="button" 
                className="btn btn-light px-4 py-2 small fw-bold text-secondary"
                style={{ borderRadius: "10px" }}
                onClick={() => setDeleteId(null)}
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
          </div>
        </div>
      )}

    </div>
  );
}
