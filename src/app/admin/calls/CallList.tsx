"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteCallLog, getCallLogStatus } from "./actions";
import { CustomAudioPlayer } from "./CallsWorkspace";

export interface CallLogListItem {
  id: string;
  createdAt: string | Date;
  status: string;
  stage: string;
  duration: number | null;
  aiScore: number | null;
  userId: string;
  lead: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
  user: {
    id: string;
    name: string;
  };
  analysis?: string | null;
  transcript?: string | null;
  translatedText?: string | null;
  detectedVoiceLanguage?: string | null;
  translatedLanguage?: string | null;
  wordCount?: number | null;
  callerPhone?: string | null;
  receiverPhone?: string | null;
  startTime?: string | Date | null;
  jobId?: string | null;
  audioUrl?: string | null;
}

// Consistent scoring logic for the list view
function getDisplayScore(log: CallLogListItem) {
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

export default function CallList({ logs }: { logs: CallLogListItem[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "missed" | "connected" | "converted">("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [expandedLeadIds, setExpandedLeadIds] = useState<Record<string, boolean>>({});
  const [activeModalLog, setActiveModalLog] = useState<CallLogListItem | null>(null);
  const [modalDetailTab, setModalDetailTab] = useState<"transcript" | "recording">("transcript");

  // Poll active modal log if it is in a placeholder state
  React.useEffect(() => {
    if (!activeModalLog) return;
    const isPlaceholder = !!(activeModalLog.transcript && activeModalLog.transcript.includes("Recording is being processed by Twilio"));
    if (!isPlaceholder) return;

    const intervalId = setInterval(async () => {
      try {
        const freshLog = await getCallLogStatus(activeModalLog.id);
        if (freshLog && freshLog.transcript && !freshLog.transcript.includes("Recording is being processed by Twilio")) {
          setActiveModalLog(freshLog as any);
          router.refresh(); // Refresh the list in the background
        }
      } catch (err) {
        console.error("Failed to poll active modal log status:", err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [activeModalLog, router]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCallLog(deleteId);
      setDeleteId(null);
    }
  };

  const toggleLeadExpanded = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLeadIds(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  // Helper to format talk time
  const formatDuration = (secs: number | null) => {
    if (!secs) return "0s";
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return mins > 0 ? `${mins}m ${remaining}s` : `${remaining}s`;
  };

  // Dynamically extract unique agents from logs
  const agentsList = useMemo(() => {
    const agentsMap = new Map();
    logs.forEach(log => {
      if (log.user) {
        agentsMap.set(log.user.id, log.user.name);
      }
    });
    return Array.from(agentsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  // Process and filter the call list based on selected filters and search query
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
        if (log.status !== "MISSED") return false;
      }
      if (selectedFilter === "connected") {
        if (log.status !== "CONNECTED") return false;
      }
      if (selectedFilter === "converted") {
        const isConverted = log.stage === "Closed" || log.stage === "Qualified" || log.stage === "Interested";
        if (!isConverted) return false;
      }

      // Agent filters
      if (selectedAgentId !== "all" && log.userId !== selectedAgentId) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedFilter, selectedAgentId]);

  // Group filtered logs by lead
  const groupedLogs = useMemo(() => {
    const groups: Record<string, { lead: CallLogListItem["lead"]; logs: CallLogListItem[]; lastCallDate: Date; totalDuration: number }> = {};
    filteredLogs.forEach(log => {
      const leadId = log.lead.id;
      if (!groups[leadId]) {
        groups[leadId] = {
          lead: log.lead,
          logs: [],
          lastCallDate: new Date(log.createdAt),
          totalDuration: 0
        };
      }
      groups[leadId].logs.push(log);
      
      const logDate = new Date(log.createdAt);
      if (logDate > groups[leadId].lastCallDate) {
        groups[leadId].lastCallDate = logDate;
      }
      groups[leadId].totalDuration += (log.duration || 0);
    });

    // Sort groups by last call date descending
    return Object.values(groups).sort((a, b) => b.lastCallDate.getTime() - a.lastCallDate.getTime());
  }, [filteredLogs]);

  return (
    <div className="d-flex flex-column gap-3 animate-fade">

      {/* 1. Header Filter & Search controls */}
      <div className="card border-0 shadow-sm p-3 bg-white" style={{ overflow: "hidden" }}>
        <div className="d-flex align-items-center justify-content-between gap-3 flex-nowrap" style={{ overflowX: "auto", width: "100%" }}>

          {/* Left Side: Search & Filter Dropdowns (No Labels) */}
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

            {/* Status Dropdown - No label */}
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as "all" | "missed" | "connected" | "converted")}
              className="form-select form-select-sm border cursor-pointer"
              style={{ width: "150px", borderRadius: "50px", height: "36px", paddingLeft: "15px", paddingRight: "30px", fontWeight: "600" }}
            >
              <option value="all">All Calls</option>
              <option value="missed">Missed</option>
              <option value="connected">Connected</option>
              <option value="converted">Converted</option>
            </select>

            {/* Agent Dropdown - No label */}
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="form-select form-select-sm border cursor-pointer"
              style={{ width: "160px", borderRadius: "50px", height: "36px", paddingLeft: "15px", paddingRight: "30px", fontWeight: "600" }}
            >
              <option value="all">All Agents</option>
              {agentsList.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
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
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px", width: "60px" }}></th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>S.No</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Customer</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Total Call Count</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Total Talk Time</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Last Interaction</th>
                <th className="border-0 small text-secondary" style={{ padding: "12px 16px" }}>Status</th>
                <th className="border-0 small text-secondary text-end" style={{ padding: "12px 16px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {groupedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-5 text-center text-secondary small">
                    No matching call history found.
                  </td>
                </tr>
              ) : (
                groupedLogs.map((group, index) => {
                  const isExpanded = !!expandedLeadIds[group.lead.id];
                  const latestLog = group.logs[0]; // Already sorted desc by date
                  const outcome = getCallOutcome(latestLog.status, latestLog.stage, group.lead.status);

                  return (
                    <React.Fragment key={group.lead.id}>
                      {/* Main Group Header Row */}
                      <tr 
                        onClick={(e) => toggleLeadExpanded(group.lead.id, e)}
                        className="cursor-pointer bg-opacity-10 hover-bg-light"
                        style={{ cursor: "pointer", transition: "all 0.15s ease", borderLeft: isExpanded ? "4px solid #0d6efd" : "4px solid transparent" }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <i className={`bi ${isExpanded ? "bi-chevron-up text-primary" : "bi-chevron-down text-muted"}`} style={{ fontSize: "14px" }}></i>
                        </td>
                        <td className="small text-secondary" style={{ padding: "12px 16px" }}>{index + 1}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: "14.5px" }}>{group.lead.name}</div>
                            <div className="text-secondary small font-monospace">{group.lead.phone}</div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-1.5 fw-bold" style={{ borderRadius: "20px" }}>
                            {group.logs.length} call{group.logs.length > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="text-secondary fw-semibold">
                            {formatDuration(group.totalDuration)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div className="text-secondary small">
                            <div>{group.lastCallDate.toLocaleDateString()}</div>
                            <div className="text-muted x-small">
                              {group.lastCallDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`badge ${outcome.class} rounded-pill px-2.5 py-1.5 fw-bold`} style={{ fontSize: "11px" }}>
                            {outcome.label}
                          </span>
                        </td>
                        <td className="text-end" style={{ padding: "12px 16px" }}>
                          <button
                            onClick={(e) => toggleLeadExpanded(group.lead.id, e)}
                            className="btn btn-sm btn-light border-0"
                          >
                            <span className="small fw-bold text-secondary me-1">{isExpanded ? "Hide Logs" : "View Logs"}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Call Log Rows */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-light p-0">
                            <div className="p-4 bg-white border-bottom shadow-inner" style={{ backgroundColor: "#f8fafc" }}>
                              <h6 className="fw-bold mb-3 text-secondary x-small text-uppercase d-flex align-items-center gap-2">
                                <i className="bi bi-clock-history text-primary"></i>
                                Call Sessions for {group.lead.name}
                              </h6>
                              <div className="table-responsive rounded-3 border overflow-hidden">
                                <table className="table table-sm table-hover align-middle mb-0 bg-white">
                                  <thead className="table-light">
                                    <tr>
                                      <th className="small text-secondary px-3 py-2">Session Date</th>
                                      <th className="small text-secondary px-3 py-2">Agent Handled</th>
                                      <th className="small text-secondary px-3 py-2">Duration</th>
                                      <th className="small text-secondary px-3 py-2">AI Score</th>
                                      <th className="small text-secondary px-3 py-2">Outcome Stage</th>
                                      <th className="small text-secondary px-3 py-2 text-end">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.logs.map((log) => {
                                      const displayScore = getDisplayScore(log);
                                      const logOutcome = getCallOutcome(log.status, log.stage, group.lead.status);
                                      
                                      let scoreColor = "text-success";
                                      if (displayScore < 85) scoreColor = "text-warning";
                                      if (displayScore < 75) scoreColor = "text-danger";

                                      return (
                                        <tr key={log.id} onClick={() => router.push(`/admin/calls/${log.id}`)} className="cursor-pointer">
                                          <td className="px-3 py-2.5 text-secondary small">
                                            {new Date(log.createdAt).toLocaleString()}
                                          </td>
                                          <td className="px-3 py-2.5 fw-semibold text-dark small">
                                            {log.user.name}
                                          </td>
                                          <td className="px-3 py-2.5 text-secondary small">
                                            {log.status === "MISSED" ? "—" : formatDuration(log.duration)}
                                          </td>
                                          <td className="px-3 py-2.5 small">
                                            {log.status === "CONNECTED" ? (
                                              <span className={`fw-bold ${scoreColor}`}>
                                                {displayScore}%
                                              </span>
                                            ) : (
                                              <span className="text-muted">—</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2.5 small">
                                            <span className={`badge ${logOutcome.class} rounded-pill px-2 py-1 fw-bold`} style={{ fontSize: "10.5px" }}>
                                              {logOutcome.label}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2.5 text-end">
                                            <div className="d-flex justify-content-end align-items-center gap-1.5">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  router.push(`/admin/calls/${log.id}`);
                                                }}
                                                className="btn btn-xs btn-light border text-primary px-2 py-0.5" 
                                                style={{ fontSize: "11px" }}
                                                title="View Details"
                                              >
                                                <i className="bi bi-eye"></i>
                                              </button>
                                              <Link 
                                                href={`/admin/calls/${log.id}/edit`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className="btn btn-xs btn-light border text-info px-2 py-0.5" 
                                                style={{ fontSize: "11px" }}
                                                title="Edit Log"
                                              >
                                                <i className="bi bi-pencil-square"></i>
                                              </Link>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteId(log.id);
                                                }}
                                                className="btn btn-xs btn-light border text-danger px-2 py-0.5"
                                                style={{ fontSize: "11px" }}
                                                title="Delete Log"
                                              >
                                                <i className="bi bi-trash"></i>
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to delete this call interaction log? This action is permanent and cannot be undone.
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

      {/* Call Details Modal */}
      {activeModalLog && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{ 
            zIndex: 1060, 
            backgroundColor: "rgba(15, 23, 42, 0.45)", 
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease"
          }}
          onClick={() => setActiveModalLog(null)}
        >
          <div 
            className="card border-0 shadow-lg p-0 w-100 mx-3 bg-white" 
            style={{ maxWidth: "680px", borderRadius: "20px", maxHeight: "85vh", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="card-header bg-white border-bottom border-light-subtle p-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-1" style={{ fontSize: "16px" }}>
                  Call Analysis: {activeModalLog.lead.name}
                </h5>
                <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>
                  Handled by Agent: <strong>{activeModalLog.user?.name || "System"}</strong> on {new Date(activeModalLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button 
                className="btn btn-light rounded-circle p-2 border-0" 
                onClick={() => setActiveModalLog(null)}
                style={{ width: "36px", height: "36px" }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="card-body p-4 overflow-auto" style={{ maxHeight: "calc(85vh - 150px)" }}>
              {/* Outcome Badges & Score */}
              <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
                <span className="fw-bold text-primary" style={{ fontSize: "14px" }}>
                  AI Qualification Score: <strong className="fs-5">{getDisplayScore(activeModalLog)}%</strong>
                </span>
                <span className={`badge ${getCallOutcome(activeModalLog.status, activeModalLog.stage, activeModalLog.lead.status).class} rounded-pill px-3 py-1.5 fw-bold`} style={{ fontSize: "12px" }}>
                  {activeModalLog.status} • {activeModalLog.stage}
                </span>
              </div>

              {/* CRM Analysis Summary */}
              {activeModalLog.analysis && (
                <div className="mb-4 p-3 bg-light rounded-3 border-0">
                  <span className="fw-bold text-secondary uppercase d-block mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>CRM Analysis Summary</span>
                  <p className="text-dark mb-0" style={{ fontSize: "13.5px", lineHeight: "1.5" }}>{activeModalLog.analysis}</p>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="d-flex border-bottom mb-3 gap-3">
                <button
                  onClick={() => setModalDetailTab("transcript")}
                  className={`btn btn-link nav-link pb-2 px-3 fw-bold border-bottom border-2 text-decoration-none ${modalDetailTab === "transcript" ? "border-primary text-primary" : "border-transparent text-secondary"}`}
                  style={{ fontSize: "13px", borderRadius: 0, boxShadow: "none" }}
                >
                  <i className="bi bi-file-earmark-text me-1.5"></i> Transcript
                </button>
                <button
                  onClick={() => setModalDetailTab("recording")}
                  className={`btn btn-link nav-link pb-2 px-3 fw-bold border-bottom border-2 text-decoration-none ${modalDetailTab === "recording" ? "border-primary text-primary" : "border-transparent text-secondary"}`}
                  style={{ fontSize: "13px", borderRadius: 0, boxShadow: "none" }}
                >
                  <i className="bi bi-play-circle me-1.5"></i> Call Recording
                </button>
              </div>

              {modalDetailTab === "transcript" ? (
                <div className="d-flex flex-column gap-3 animate-fade">
                  {(() => {
                    try {
                      const rawTurns = JSON.parse(activeModalLog.transcript || "[]");
                      if (Array.isArray(rawTurns) && rawTurns.length > 0) {
                        const turns: any[] = [];
                        rawTurns.forEach((turn: any) => {
                          const last = turns[turns.length - 1];
                          if (last && last.speaker === turn.speaker) {
                            last.text = (last.text + " " + turn.text).trim();
                            if (turn.translation || last.translation) {
                              last.translation = ((last.translation || "") + " " + (turn.translation || "")).trim();
                            }
                          } else {
                            turns.push({ ...turn });
                          }
                        });
                        return (
                          <div className="d-flex flex-column gap-3">
                            {turns.map((turn: any, idx: number) => {
                              const isAgent = turn.speaker === "Agent";
                              const speakerName = isAgent ? (activeModalLog.user?.name || "Agent") : (activeModalLog.lead?.name || "Lead");
                              const showTranslation = !!turn.translation && turn.translation !== turn.text;
                              
                              return (
                                <div key={idx} className={`d-flex gap-3 align-items-start ${isAgent ? "" : "flex-row-reverse"}`}>
                                  <div 
                                    className={`rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm fw-bold text-white ${
                                      isAgent ? "bg-primary" : "bg-success"
                                    }`} 
                                    style={{ width: 36, height: 36, fontSize: 13 }}
                                  >
                                    {isAgent ? "A" : "L"}
                                  </div>
                                  <div 
                                    className={`p-3 rounded-4 flex-grow-1 shadow-sm border ${
                                      isAgent 
                                        ? "bg-white border-light-subtle text-start" 
                                        : "bg-success bg-opacity-10 border-success border-opacity-20 text-end"
                                    }`}
                                    style={{ maxWidth: "80%" }}
                                  >
                                    <div className={`d-flex justify-content-between align-items-center mb-1.5 ${isAgent ? "" : "flex-row-reverse"}`}>
                                      <span className={`fw-bold small ${isAgent ? "text-primary" : "text-success"}`}>
                                        {speakerName}
                                      </span>
                                      <span className="x-small text-secondary font-monospace">{turn.time}</span>
                                    </div>
                                    <div className="d-flex flex-column gap-1">
                                      {showTranslation && (
                                        <div className={`x-small text-muted mb-0.5 ${isAgent ? "text-start" : "text-end"}`}>
                                          <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: "9px" }}>ORIGINAL SPEECH</span>
                                        </div>
                                      )}
                                      <p className="small mb-0 text-dark fw-medium" style={{ wordBreak: "break-word", lineHeight: "1.5" }}>
                                        {turn.text}
                                      </p>
                                    </div>
                                    {showTranslation && (
                                      <div className={`mt-2 pt-2 border-top border-secondary border-opacity-10 x-small text-muted ${isAgent ? "text-start" : "text-end"}`}>
                                        <div className="mb-1">
                                          <span className="badge bg-success bg-opacity-15" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>TRANSLATED TO ENGLISH</span>
                                        </div>
                                        <div className="mt-1 font-monospace fw-semibold text-secondary" style={{ whiteSpace: "pre-wrap" }}>
                                          {turn.translation}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    } catch (e) {
                      // ignore json error
                    }
                    return (
                      <p className="small text-muted mb-0">{activeModalLog.translatedText || activeModalLog.transcript || "No transcript available."}</p>
                    );
                  })()}
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 bg-light rounded-3 border-0">
                    <h6 className="fw-bold text-dark mb-2 small text-uppercase tracking-wider">Recording Details</h6>
                    <div className="row g-2 text-secondary" style={{ fontSize: "12px" }}>
                      <div className="col-6">
                        <span className="fw-bold">Caller:</span> {activeModalLog.callerPhone || "+1 (555) 019-2834"}
                      </div>
                      <div className="col-6">
                        <span className="fw-bold">Receiver:</span> {activeModalLog.receiverPhone || activeModalLog.lead.phone}
                      </div>
                      <div className="col-6">
                        <span className="fw-bold">Duration:</span> {activeModalLog.duration || 0} seconds
                      </div>
                      <div className="col-6">
                        <span className="fw-bold">Date:</span> {new Date(activeModalLog.startTime || activeModalLog.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-column align-items-center w-100 p-3 bg-light rounded-3">
                    <span className="text-secondary fw-bold small uppercase mb-2" style={{ fontSize: "10px", letterSpacing: "1px" }}>PLAY RECORDING</span>
                    <CustomAudioPlayer
                      src={activeModalLog.jobId ? `/api/recordings/${activeModalLog.jobId}` : (activeModalLog.audioUrl || "")}
                      initialDuration={activeModalLog.duration || 0}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="card-footer bg-white border-top border-light-subtle p-3 d-flex justify-content-between">
              {activeModalLog && (
                <Link
                  href={`/admin/calls/${activeModalLog.id}`}
                  className="btn btn-outline-primary px-4 d-flex align-items-center gap-2"
                >
                  <i className="bi bi-eye"></i>
                  View Details
                </Link>
              )}
              <button 
                type="button" 
                className="btn btn-secondary px-4" 
                onClick={() => setActiveModalLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
