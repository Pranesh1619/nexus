"use client";

import React, { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateAgentLead, logAgentLeadCall, updateAgentLeadCall } from "./actions";

type CallLog = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  status: string;
  stage: string;
  aiScore: number | null;
  notes: string | null;
  transcript: string | null;
  analysis: string | null;
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
  initialAgents: Agent[];
}

const CALL_STAGES = [
  "New Lead",
  "Attempted Contact",
  "Connected",
  "Enquiry",
  "Engaged",
  "Interested",
  "Desire",
  "Qualified",
  "Follow-up Needed",
  "Closed"
];

const LEAD_STAGES = [
  { id: "NEW", title: "Discovery" },
  { id: "CONTACTED", title: "Proposal" },
  { id: "QUALIFIED", title: "Negotiation" },
  { id: "WON", title: "Closed Won" },
  { id: "LOST", title: "Closed Lost" }
];

export default function AgentsWorkspace({ initialAgents }: AgentsWorkspaceProps) {
  const agents = initialAgents;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || "");

  const selectedAgent = useMemo(() => {
    return agents.find((a) => a.id === selectedAgentId);
  }, [agents, selectedAgentId]);

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

    return {
      totalLeads,
      totalCalls,
      wonLeads,
      conversionRate,
      avgDuration,
    };
  }, [selectedAgent]);

  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [localSelectedLeadId, setLocalSelectedLeadId] = useState<string | null>(null);

  const filteredLeadsForWorkspace = useMemo(() => {
    if (!selectedAgent) return [];
    const leads = selectedAgent.leads;
    if (!leadSearchQuery) return leads;
    const q = leadSearchQuery.toLowerCase();
    return leads.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.company || "").toLowerCase().includes(q) ||
      l.phone.includes(q)
    );
  }, [selectedAgent, leadSearchQuery]);

  const activeLead = useMemo(() => {
    if (!selectedAgent) return null;
    if (localSelectedLeadId) {
      const found = selectedAgent.leads.find((l) => l.id === localSelectedLeadId);
      if (found) return found;
    }
    return filteredLeadsForWorkspace[0] || null;
  }, [selectedAgent, localSelectedLeadId, filteredLeadsForWorkspace]);

  const activeLeadCalls = useMemo(() => {
    if (!activeLead || !selectedAgent) return [];
    return selectedAgent.calls.filter((c) => c.leadId === activeLead.id);
  }, [activeLead, selectedAgent]);

  const [activeConsoleView, setActiveConsoleView] = useState<"lead" | "call">("lead");
  const [activeCallLog, setActiveCallLog] = useState<CallLog | null>(null);

  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
  const [selectedCallIndex, setSelectedCallIndex] = useState(0);

  const maxLeadIndex = useMemo(() => {
    if (!activeLead) return 0;
    const idx = LEAD_STAGES.findIndex(s => s.id === activeLead.status);
    return idx === -1 ? 0 : idx;
  }, [activeLead]);

  const maxCallIndex = useMemo(() => {
    if (!activeCallLog) return 0;
    const idx = CALL_STAGES.indexOf(activeCallLog.stage);
    return idx === -1 ? 0 : idx;
  }, [activeCallLog]);

  useEffect(() => {
    setSelectedLeadIndex(maxLeadIndex);
  }, [maxLeadIndex]);

  useEffect(() => {
    setSelectedCallIndex(maxCallIndex);
  }, [maxCallIndex]);

  useEffect(() => {
    if (activeLead && selectedAgent) {
      const leadCalls = selectedAgent.calls.filter((c) => c.leadId === activeLead.id);
      setActiveCallLog(leadCalls[0] || null);
    } else {
      setActiveCallLog(null);
    }
  }, [activeLead, selectedAgent]);

  const [isEditingLead, setIsEditingLead] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [selectedCallDetail, setSelectedCallDetail] = useState<CallLog | null>(null);
  const [isEditingCallDetail, setIsEditingCallDetail] = useState(false);

  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSympathy, setShowSympathy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [isUpdatingTimeline, setIsUpdatingTimeline] = useState(false);

  const [editLeadForm, setEditLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    source: "",
    status: ""
  });

  const [logCallForm, setLogCallForm] = useState({
    status: "CONNECTED",
    stage: "Connected",
    duration: "60",
    aiScore: "85",
    notes: "",
    transcript: ""
  });

  const [editCallForm, setEditCallForm] = useState({
    status: "",
    stage: "",
    duration: "60",
    aiScore: "85",
    notes: "",
    transcript: ""
  });

  useEffect(() => {
    if (activeLead) {
      setEditLeadForm({
        name: activeLead.name,
        phone: activeLead.phone,
        email: activeLead.email || "",
        company: activeLead.company || "",
        source: activeLead.source || "COLD_CALL",
        status: activeLead.status
      });
    }
  }, [activeLead]);

  useEffect(() => {
    if (selectedCallDetail) {
      setEditCallForm({
        status: selectedCallDetail.status,
        stage: selectedCallDetail.stage,
        duration: String(selectedCallDetail.duration || 60),
        aiScore: String(selectedCallDetail.aiScore || 0),
        notes: selectedCallDetail.notes || "",
        transcript: selectedCallDetail.transcript || ""
      });
    }
  }, [selectedCallDetail]);

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;
    startTransition(async () => {
      try {
        await updateAgentLead(activeLead.id, {
          name: editLeadForm.name,
          phone: editLeadForm.phone,
          email: editLeadForm.email,
          company: editLeadForm.company,
          source: editLeadForm.source,
          status: editLeadForm.status
        });
        setIsEditingLead(false);
        router.refresh();
      } catch (err) {
        console.error("Failed to update lead:", err);
        alert("Failed to save lead updates. Ensure phone number is unique.");
      }
    });
  };

  const handleSaveLoggedCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !selectedAgent) return;
    startTransition(async () => {
      try {
        await logAgentLeadCall({
          leadId: activeLead.id,
          userId: selectedAgent.id,
          duration: Number(logCallForm.duration),
          status: logCallForm.status,
          stage: logCallForm.stage,
          notes: logCallForm.notes,
          transcript: logCallForm.transcript,
          aiScore: Number(logCallForm.aiScore)
        });
        setIsLoggingCall(false);
        setLogCallForm({ status: "CONNECTED", stage: "Connected", duration: "60", aiScore: "85", notes: "", transcript: "" });
        router.refresh();
      } catch (err) {
        console.error("Failed to log call:", err);
        alert("Failed to log call interaction.");
      }
    });
  };

  const handleUpdateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCallDetail) return;
    startTransition(async () => {
      try {
        await updateAgentLeadCall(selectedCallDetail.id, {
          status: editCallForm.status,
          stage: editCallForm.stage,
          notes: editCallForm.notes,
          aiScore: Number(editCallForm.aiScore),
          transcript: editCallForm.transcript
        });
        setIsEditingCallDetail(false);
        setSelectedCallDetail(null);
        router.refresh();
      } catch (err) {
        console.error("Failed to update call log:", err);
        alert("Failed to update call details.");
      }
    });
  };

  const handleUpdateLeadStagePermanent = async () => {
    if (!activeLead) return;
    const targetStage = LEAD_STAGES[selectedLeadIndex];
    if (targetStage.id === "WON" || targetStage.id === "LOST") {
      setShowOutcomeModal(true);
      return;
    }
    setIsUpdatingTimeline(true);
    setSyncStatus("syncing");
    try {
      await updateAgentLead(activeLead.id, {
        name: activeLead.name, phone: activeLead.phone, email: activeLead.email,
        company: activeLead.company, source: activeLead.source, status: targetStage.id
      });
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
      router.refresh();
    } catch (error) {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } finally {
      setIsUpdatingTimeline(false);
    }
  };

  const handleUpdateCallStagePermanent = async () => {
    if (!activeCallLog) return;
    const targetStage = CALL_STAGES[selectedCallIndex];
    setIsUpdatingTimeline(true);
    try {
      await updateAgentLeadCall(activeCallLog.id, {
        status: activeCallLog.status, stage: targetStage,
        notes: activeCallLog.notes, aiScore: activeCallLog.aiScore || 0,
        transcript: activeCallLog.transcript
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update call stage:", error);
    } finally {
      setIsUpdatingTimeline(false);
    }
  };

  const handleConfirmOutcome = async (finalOutcome: "WON" | "LOST") => {
    if (!activeLead) return;
    setShowOutcomeModal(false);
    if (finalOutcome === "WON") setShowCelebration(true);
    else setShowSympathy(true);
    setIsUpdatingTimeline(true);
    setTimeout(async () => {
      setShowCelebration(false);
      setShowSympathy(false);
      setSyncStatus("syncing");
      try {
        await updateAgentLead(activeLead.id, {
          name: activeLead.name, phone: activeLead.phone, email: activeLead.email,
          company: activeLead.company, source: activeLead.source, status: finalOutcome
        });
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("idle"), 3000);
        router.refresh();
      } catch (error) {
        setSyncStatus("error");
        setTimeout(() => setSyncStatus("idle"), 3000);
      } finally {
        setIsUpdatingTimeline(false);
      }
    }, 3200);
  };

  const handleOpenLogCall = () => {
    setLogCallForm({ status: "CONNECTED", stage: "Connected", duration: "60", aiScore: "85", notes: "", transcript: "" });
    setIsLoggingCall(true);
  };

  const handleOpenEditCall = (call: CallLog) => {
    setEditCallForm({
      status: call.status, stage: call.stage,
      duration: String(call.duration || 60), aiScore: String(call.aiScore || 0),
      notes: call.notes || "", transcript: call.transcript || ""
    });
    setIsEditingCallDetail(true);
  };

  const getLeadStageDetails = (stageId: string) => {
    if (!activeLead) return null;
    const idx = LEAD_STAGES.findIndex(s => s.id === stageId);
    const isReached = idx <= maxLeadIndex;
    let medium = "System Record";
    let time = "—";
    let notes = "This stage is currently pending in the pipeline.";
    const formattedCreatedAt = activeLead.createdAt ? new Date(activeLead.createdAt).toLocaleString() : "—";
    const formattedUpdatedAt = activeLead.createdAt ? new Date(activeLead.createdAt).toLocaleString() : "—";

    if (stageId === "NEW") {
      medium = activeLead.source ? `Source: ${activeLead.source}` : "System Entry";
      time = formattedCreatedAt;
      notes = "Lead discovered and registered in the database. Initial tracking initiated.";
    } else if (stageId === "CONTACTED") {
      if (isReached) {
        const contactCall = activeLeadCalls.find(c => c.status === "CONNECTED" || c.stage.includes("Contact") || c.stage.includes("Connected") || c.stage.includes("Attempted"));
        medium = contactCall ? `Voice Call Log (Duration: ${contactCall.duration || 0}s)` : "Manual Status Update";
        time = contactCall ? new Date(contactCall.createdAt).toLocaleString() : formattedCreatedAt;
        notes = "First-touch outreach completed successfully. Value proposition delivered.";
      } else {
        medium = "Awaiting Phone Outreach";
        notes = "Awaiting the representative to make the initial phone call and log outcomes.";
      }
    } else if (stageId === "QUALIFIED") {
      if (isReached) {
        const qualCall = activeLeadCalls.find(c => c.stage.includes("Qualified") || c.stage.includes("Interested") || c.stage.includes("Engaged"));
        medium = qualCall ? `AI-Analyzed Call (Score: ${qualCall.aiScore || 0}%)` : "Sales Agent Verification";
        time = qualCall ? new Date(qualCall.createdAt).toLocaleString() : formattedCreatedAt;
        notes = "Lead qualifications verified. Client requirements align with our current BPO offerings.";
      } else {
        medium = "Awaiting Qualification Check";
        notes = "Reviewing business requirements, size, and budget to qualify the lead.";
      }
    } else if (stageId === "WON") {
      if (activeLead.status === "WON" || activeLead.status === "CLOSED_WON") {
        medium = "Contract Execution / Closing Session";
        time = formattedUpdatedAt;
        notes = "Deal officially WON! Handed over to operations for onboarding and service delivery.";
      } else {
        medium = "Closing Phase Pipeline";
        notes = "Proposal finalized. Reviewing contracts and awaiting final signature.";
      }
    } else if (stageId === "LOST") {
      if (activeLead.status === "LOST" || activeLead.status === "CLOSED_LOST") {
        medium = "Representative Handled Closing Call";
        time = formattedUpdatedAt;
        notes = "Deal closed as LOST. Feedback logged for future pipeline optimization.";
      } else {
        medium = "Closing Phase Pipeline";
        notes = "Standard closing review. Active unless explicitly closed as lost.";
      }
    }

    return { title: LEAD_STAGES[idx]?.title || "", isReached, medium, time, notes };
  };

  const stageDetails = useMemo(() => {
    if (!activeLead) return null;
    const stage = LEAD_STAGES[selectedLeadIndex];
    if (!stage) return null;
    return getLeadStageDetails(stage.id);
  }, [activeLead, selectedLeadIndex, activeLeadCalls, maxLeadIndex]);

  return (
    <div className="container-fluid p-0 animate-fade">
      <style>{`
        .btn-custom-brand {
          color: #00A76F !important;
          border-color: #00A76F !important;
          background-color: transparent !important;
          transition: all 0.2s ease-in-out;
        }
        .btn-custom-brand:hover {
          color: #ffffff !important;
          background-color: #00A76F !important;
          border-color: #00A76F !important;
        }
        .btn-custom-brand i {
          color: #00A76F !important;
          transition: all 0.2s ease-in-out;
        }
        .btn-custom-brand:hover i {
          color: #ffffff !important;
        }
      `}</style>

      {/* =============================================
          CARD 1: Agent Summary — styled like screenshot
          ============================================= */}
      <div className="card border shadow-sm mb-4 bg-white p-4 rounded-4" style={{ borderColor: "#eef2f6" }}>
        <div className="d-flex flex-column gap-3.5">
          
          {/* Top Row: Avatar + Agent Info on Left, vertical line, Agent dropdown on Right */}
          <div className="row align-items-center justify-content-between g-3 pb-2">
            {selectedAgent ? (
              <div className="col-md-7 col-12 d-flex align-items-center gap-4">
                {/* Avatar circle (blue/sky style) with generous spacing */}
                <div
                  className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold text-uppercase flex-shrink-0"
                  style={{ width: "56px", height: "56px", fontSize: "20px", color: "#3b82f6", backgroundColor: "#eff6ff" }}
                >
                  {selectedAgent.name.charAt(0)}
                </div>

                <div className="flex-grow-1">
                  {/* Row 1: Name (Simply raw agent name with no workspace suffix) */}
                  <h4 className="fw-bold mb-1.5 text-dark" style={{ fontSize: "18.5px" }}>
                    {selectedAgent.name}
                  </h4>

                  {/* Row 2: Role, Email, and Active Status Inline with tight spacing */}
                  <div className="d-flex align-items-center flex-wrap gap-2 text-secondary small mt-1">
                    <span className="badge bg-light text-secondary border fw-semibold px-2 py-0.5" style={{ fontSize: "10.5px", letterSpacing: "0.3px", backgroundColor: "#f8fafc" }}>
                      {selectedAgent.role.toUpperCase()}
                    </span>
                    <span className="text-muted opacity-50">•</span>
                    <span className="font-monospace" style={{ fontSize: "12.5px" }}>{selectedAgent.email}</span>
                    <span className="text-success fw-bold d-inline-flex align-items-center ms-2" style={{ fontSize: "12.5px" }}>
                      • Active
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-md-7 col-12">
                <h5 className="fw-bold mb-0 text-dark">No Representative Selected</h5>
              </div>
            )}

            {/* Centered vertical straight line for info and select agent with a beautiful grey color */}
            <div className="col-md-auto d-none d-md-block px-1 text-center">
              <div style={{ width: "1px", height: "55px", backgroundColor: "#cbd5e1" }}></div>
            </div>

            {/* Right dropdown container with custom AGENT SELECTION icon label */}
            <div className="col-md-4 col-12 py-1">
              <div className="flex-grow-1">
                <label className="form-label small fw-bold mb-2 d-flex align-items-center gap-2" style={{ fontSize: "11px", letterSpacing: "0.5px", color: "#475569" }}>
                  <i className="bi bi-person-badge text-primary" style={{ fontSize: "14px", color: "#3b82f6" }}></i>
                  <span>Agent Selection</span>
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => {
                    setSelectedAgentId(e.target.value);
                    setLocalSelectedLeadId(null);
                  }}
                  className="form-select border shadow-sm py-2 px-3 bg-white"
                  style={{ borderRadius: "10px", fontWeight: "600", fontSize: "14px", color: "#334155", borderColor: "#cbd5e1" }}
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.leads.length} leads assigned)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Horizontal Divider Line */}
          <hr className="my-0 border-light-subtle opacity-75" />

          {/* Bottom Row: Row of 4 metric cells, each separated by a thin vertical divider line */}
          {stats && (
            <div className="row g-3 align-items-center text-start pt-2">
              
              {/* Cell 1: Leads Assigned */}
              <div className="col-6 col-sm-3 border-end border-light-subtle">
                <div className="fs-3 fw-bold text-dark mb-1.5" style={{ lineHeight: "1" }}>{stats.totalLeads}</div>
                <div className="text-secondary small fw-semibold">Leads assigned</div>
              </div>

              {/* Cell 2: Total Calls */}
              <div className="col-6 col-sm-3 border-end border-light-subtle ps-sm-4">
                <div className="fs-3 fw-bold text-dark mb-1.5" style={{ lineHeight: "1" }}>{stats.totalCalls}</div>
                <div className="text-secondary small fw-semibold">Total calls</div>
              </div>

              {/* Cell 3: Closed Won */}
              <div className="col-6 col-sm-3 border-end border-light-subtle ps-sm-4">
                <div className="fs-3 fw-bold text-dark mb-1.5" style={{ lineHeight: "1" }}>{stats.wonLeads}</div>
                <div className="text-secondary small fw-semibold">Closed won</div>
              </div>

              {/* Cell 4: Conversion Rate */}
              <div className="col-6 col-sm-3 ps-sm-4">
                <div className="d-flex align-items-baseline gap-2 mb-1.5">
                  <span className="fs-3 fw-bold text-dark" style={{ lineHeight: "1" }}>{stats.conversionRate}%</span>
                  <span className="text-muted font-monospace" style={{ fontSize: "11px" }}>· {stats.avgDuration}s avg</span>
                </div>
                <div className="text-secondary small fw-semibold">Conversion</div>
              </div>

            </div>
          )}

        </div>
      </div>

      {isPending && (
        <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-4 shadow-sm border-0" style={{ borderRadius: "10px" }}>
          <span className="spinner-border spinner-border-sm"></span>
          <span>Saving workspace details...</span>
        </div>
      )}

      {selectedAgent ? (
        <div>
          {/* =============================================
              CARD 2: Interactive Lead CRM Console
              — clean list item, zero padding on right panel
              ============================================= */}
          <div className="card border-0 shadow-sm mb-4 rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white border-bottom border-light-subtle p-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                <div>
                  <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "15.5px" }}>
                    <i className="bi bi-person-workspace text-success"></i>
                    Interactive Lead CRM Console
                  </h5>
                  <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>
                    Search representative leads, view pipeline stages, update metrics, and inspect transcripts.
                  </p>
                </div>
                {activeLead && (
                  <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1.5 small fw-semibold">
                    Active: {activeLead.name}
                  </span>
                )}
              </div>
            </div>

            <div className="row g-0" style={{ minHeight: "550px" }}>

              {/* LEFT PANEL: Lead list (Fixed & scrollable inside console card) */}
              <div className="col-md-3 border-end border-light-subtle d-flex flex-column" style={{ height: "calc(100vh - 280px)", minHeight: "550px", overflowY: "auto" }}>

                {/* Search */}
                <div className="p-3 border-bottom border-light-subtle">
                  <div className="position-relative">
                    <i className="bi bi-search position-absolute text-secondary" style={{ left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}></i>
                    <input
                      type="text"
                      placeholder="Search leads..."
                      value={leadSearchQuery}
                      onChange={(e) => setLeadSearchQuery(e.target.value)}
                      className="form-control w-100 search-input-field"
                      style={{ paddingLeft: "36px", fontSize: "13.5px" }}
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-grow-1 overflow-auto">
                  {filteredLeadsForWorkspace.length === 0 ? (
                    <div className="p-5 text-center text-secondary small">
                      <i className="bi bi-person-dash fs-2 d-block mb-2 text-muted"></i>
                      No leads match query.
                    </div>
                  ) : (
                    filteredLeadsForWorkspace.map((l) => {
                      const isSelected = activeLead?.id === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => setLocalSelectedLeadId(l.id)}
                          className={`lead-list-btn w-100 text-start border-0 px-3 py-3 d-flex flex-column gap-1 ${
                            isSelected
                              ? "active-lead-item bg-white border-start border-3 border-success"
                              : "bg-transparent"
                          }`}
                          style={{
                            cursor: "pointer",
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s"
                          }}
                        >
                          <div className="d-flex w-100 justify-content-between align-items-center">
                            <span
                              className="text-dark fw-semibold"
                              style={{ fontSize: "13.5px", color: isSelected ? "#198754" : undefined }}
                            >
                              {l.name}
                            </span>
                            <span
                              className="badge"
                              style={{
                                fontSize: "10px",
                                backgroundColor: isSelected ? "rgba(25,135,84,0.1)" : "#f1f5f9",
                                color: isSelected ? "#198754" : "#6c757d"
                              }}
                            >
                              {l.status}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-secondary" style={{ fontSize: "11.5px" }}>
                            <span className="text-truncate">{l.company || "No Company"}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: Lead detail — scrolls independently */}
              <div className="col-md-9 d-flex flex-column" style={{ height: "calc(100vh - 280px)", minHeight: "550px", overflowY: "auto" }}>
                {activeLead ? (
                  <div className="p-4 d-flex flex-column gap-4">

                    {/* ALWAYS VISIBLE: Raw Unboxed Lead Header with Profile Data */}
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 pb-2 border-bottom border-light-subtle mb-4">
                      {/* Left Side: Lead Details with Round Profile Avatar Icon */}
                      <div className="d-flex align-items-center gap-3">
                        {/* Round Avatar Circle for Lead (using green/teal theme to match workspace) */}
                        <div
                          className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center fw-bold text-uppercase flex-shrink-0"
                          style={{ width: "54px", height: "54px", fontSize: "20px", color: "#00A76F", backgroundColor: "rgba(0, 167, 111, 0.08)" }}
                        >
                          {activeLead.name.charAt(0)}
                        </div>

                        <div>
                          {/* Row 1: Name and inline Edit button */}
                          <div className="d-flex align-items-center flex-wrap mb-2">
                            <h4 className="fw-bold text-dark mb-0" style={{ fontSize: "19px" }}>{activeLead.name}</h4>
                            <button
                              onClick={() => setIsEditingLead(true)}
                              className="btn btn-xs btn-outline-success d-inline-flex align-items-center gap-1.5 py-0.5 px-3 ms-4"
                              style={{ fontSize: "11px", borderRadius: "20px", height: "24px", borderColor: "#00A76F", color: "#00A76F", fontWeight: "600" }}
                              title="Edit Profile"
                            >
                              <i className="bi bi-person-gear"></i> Edit
                            </button>
                          </div>
                          {/* Row 2: Email Only */}
                          <div className="text-secondary small mb-1.5" style={{ fontSize: "12.5px" }}>
                            <i className="bi bi-envelope text-muted me-2"></i>{activeLead.email || "No Email"}
                          </div>
                          {/* Row 3: Phone Only */}
                          <div className="text-secondary small" style={{ fontSize: "12.5px" }}>
                            <i className="bi bi-telephone text-muted me-2"></i>{activeLead.phone}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Quick info showing call counts */}
                      <div>
                        {activeLeadCalls.length > 0 ? (
                          <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-1.5 small fw-semibold">
                            <i className="bi bi-telephone-outbound-fill me-1.5"></i>
                            {activeLeadCalls.length} Call Logs
                          </span>
                        ) : (
                          <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-1.5 small fw-semibold">
                            No Call Logs Found
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unified Lead & Call Workspace */}
                    <div className="d-flex flex-column gap-4">

                        {/* Lead Lifecycle Timeline */}
                        <div className="card border-0 shadow-sm overflow-hidden bg-white">
                          <div className="card-header bg-white border-0 pt-3 px-3 pb-0 d-flex justify-content-between align-items-center">
                            <div>
                              <p className="text-secondary mb-0 fw-bold" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                <i className="bi bi-diagram-3-fill text-success me-1"></i> Lead Lifecycle Stage
                              </p>
                              <p className="text-dark mb-0 fw-bold" style={{ fontSize: "13px" }}>
                                Current Stage: <span className="text-success">{LEAD_STAGES[selectedLeadIndex]?.title || "Discovery"}</span>
                              </p>
                            </div>
                            {selectedLeadIndex !== maxLeadIndex && (
                              <button
                                onClick={handleUpdateLeadStagePermanent}
                                disabled={isUpdatingTimeline}
                                className="btn btn-sm btn-outline-success"
                                style={{ borderRadius: "50px", fontSize: "11px" }}
                              >
                                {isUpdatingTimeline ? "Syncing..." : "Update Status"}
                              </button>
                            )}
                          </div>

                          <div className="p-4 overflow-auto">
                            <div className="position-relative pb-4">
                              <div className="progress position-absolute w-100" style={{ height: "2px", top: "28px", backgroundColor: "#f0f0f0" }}>
                                <div
                                  className="progress-bar bg-success"
                                  style={{ width: `${(maxLeadIndex / (LEAD_STAGES.length - 1)) * 100}%`, transition: "width 0.5s ease-in-out" }}
                                ></div>
                              </div>
                              <div className="d-flex justify-content-between position-relative z-1">
                                {LEAD_STAGES.map((stage, index) => {
                                  const isReached = index <= maxLeadIndex;
                                  const isSelected = index === selectedLeadIndex;
                                  return (
                                    <div key={stage.id} className="text-center" style={{ width: "90px" }}>
                                      <div
                                        onClick={() => setSelectedLeadIndex(index)}
                                        className={`bubble-step ${isSelected ? "active" : ""} ${isReached ? "reached" : ""}`}
                                      >
                                        <div className="bubble-box shadow-sm" style={{ width: "36px", height: "26px", fontSize: "12px" }}>
                                          {index + 1}
                                          <div className="bubble-pointer"></div>
                                        </div>
                                        <div className="bubble-dot" style={{ width: "10px", height: "10px" }}></div>
                                        <div
                                          className="bubble-label mt-2 fw-bold"
                                          style={{
                                            fontSize: "10.5px",
                                            color: isSelected ? "#0d6efd" : isReached ? "#198754" : "#adb5bd"
                                          }}
                                        >
                                          {stage.title}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {stageDetails && (
                            <div className="border-top bg-light bg-opacity-40 p-3">
                              <div className="d-flex align-items-center gap-2 mb-3">
                                <i className="bi bi-info-circle text-success"></i>
                                <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>{stageDetails.title} Phase Insights</span>
                                <span className={`badge px-2 py-1 rounded-pill ${stageDetails.isReached ? "bg-success bg-opacity-10 text-success" : "bg-secondary bg-opacity-10 text-secondary"}`} style={{ fontSize: "10px" }}>
                                  {stageDetails.isReached ? "Reached / Completed" : "Pipeline Queue"}
                                </span>
                              </div>
                              <div className="row g-2">
                                {[
                                  { icon: "bi-compass", label: "Medium / Reference", value: stageDetails.medium },
                                  { icon: "bi-clock", label: "Logged Timestamp", value: stageDetails.time },
                                  { icon: "bi-card-text", label: "Phase Description", value: stageDetails.notes }
                                ].map((item, i) => (
                                  <div className="col-md-4" key={i}>
                                    <div className="bg-white p-3 rounded-3 shadow-sm border border-light-subtle h-100">
                                      <span className="text-secondary d-block mb-1" style={{ fontSize: "9px", letterSpacing: "0.3px", textTransform: "uppercase", fontWeight: 700 }}>
                                        <i className={`bi ${item.icon} text-success me-1`}></i> {item.label}
                                      </span>
                                      <span className="text-dark d-block" style={{ fontSize: "12px" }}>{item.value}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Call stage pipeline and transcript shown directly below */}
                        {activeCallLog && (
                          <div className="d-flex flex-column gap-4 animate-fade mt-1">

                          {/* Call stage pipeline */}
                          <div className="card border-0 shadow-sm overflow-hidden bg-white">
                            <div className="card-header bg-white border-0 pt-3 px-3 pb-0 d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-secondary mb-0 fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>
                                  <i className="bi bi-diagram-3-fill text-info me-1"></i> Call Stage Pipeline
                                </p>
                                <p className="text-dark mb-0 fw-bold" style={{ fontSize: "13px" }}>
                                  Current: <span className="text-info">{CALL_STAGES[selectedCallIndex]}</span>
                                </p>
                              </div>
                              {selectedCallIndex !== maxCallIndex && (
                                <button
                                  onClick={handleUpdateCallStagePermanent}
                                  disabled={isUpdatingTimeline}
                                  className="btn btn-sm btn-outline-info"
                                  style={{ borderRadius: "50px", fontSize: "11px" }}
                                >
                                  {isUpdatingTimeline ? "Syncing..." : "Update Call Stage"}
                                </button>
                              )}
                            </div>
                            <div className="p-4 overflow-auto">
                              <div className="position-relative pb-4" style={{ minWidth: "850px" }}>
                                <div className="progress position-absolute w-100" style={{ height: "2px", top: "28px", backgroundColor: "#f0f0f0" }}>
                                  <div
                                    className="progress-bar bg-info"
                                    style={{ width: `${(maxCallIndex / (CALL_STAGES.length - 1)) * 100}%`, transition: "width 0.5s ease-in-out" }}
                                  ></div>
                                </div>
                                <div className="d-flex justify-content-between position-relative z-1">
                                  {CALL_STAGES.map((stage, index) => {
                                    const isReached = index <= maxCallIndex;
                                    const isSelected = index === selectedCallIndex;
                                    return (
                                      <div key={stage} className="text-center" style={{ width: "70px" }}>
                                        <div
                                          onClick={() => setSelectedCallIndex(index)}
                                          className={`bubble-step ${isSelected ? "active-call" : ""} ${isReached ? "reached-call" : ""}`}
                                        >
                                          <div className="bubble-box shadow-sm" style={{ width: "32px", height: "24px", fontSize: "11px" }}>
                                            {index + 1}
                                            <div className="bubble-pointer"></div>
                                          </div>
                                          <div className="bubble-dot" style={{ width: "10px", height: "10px" }}></div>
                                          <div
                                            className="bubble-label mt-2 fw-bold"
                                            style={{ fontSize: "10px", color: isSelected ? "#0d6efd" : isReached ? "#00A76F" : "#adb5bd" }}
                                          >
                                            {stage}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Full width premium Transcript Only — styled EXACTLY like Calls Page */}
                          <div className="card border shadow-sm rounded-4 overflow-hidden bg-white">
                            <div className="card-body p-4">
                              <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                                <i className="bi bi-card-text text-secondary"></i> Interactive Transcript
                              </h5>
                              <div className="transcript-wrapper pe-2" style={{ maxHeight: "450px", overflowY: "auto" }}>
                                <div className="d-flex flex-column gap-4">
                                  {/* Message 1: Agent */}
                                  <div className="d-flex gap-3 align-items-start">
                                    <div className="bg-primary text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 36, height: 36, fontSize: 14 }}>A</div>
                                    <div className="bg-light p-3 rounded-4 flex-grow-1 shadow-sm border">
                                      <div className="d-flex justify-content-between mb-1">
                                        <span className="fw-bold small text-primary">Agent: {selectedAgent?.name || "Representative"}</span>
                                        <span className="x-small text-secondary">00:05</span>
                                      </div>
                                      <p className="small mb-0 text-dark">Hello, thank you for reaching out to Virpa Intelligent Sales Agent support. How can I assist you with your business needs today?</p>
                                    </div>
                                  </div>
                                  
                                  {/* Message 2: Lead */}
                                  <div className="d-flex gap-3 align-items-start flex-row-reverse">
                                    <div className="bg-success text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 36, height: 36, fontSize: 14 }}>L</div>
                                    <div className="bg-success bg-opacity-10 p-3 rounded-4 flex-grow-1 shadow-sm border border-success border-opacity-10 text-end">
                                      <div className="d-flex justify-content-between flex-row-reverse mb-1">
                                        <span className="fw-bold small text-success">Lead: {activeLead.name}</span>
                                        <span className="x-small text-secondary">00:12</span>
                                      </div>
                                      <p className="small mb-0 text-dark">{"Hi, I'm interested in scaling our customer support team and heard you provide managed services for the tech sector."}</p>
                                    </div>
                                  </div>

                                  {/* Message 3: Agent */}
                                  <div className="d-flex gap-3 align-items-start">
                                    <div className="bg-primary text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 36, height: 36, fontSize: 14 }}>A</div>
                                    <div className="bg-light p-3 rounded-4 flex-grow-1 shadow-sm border">
                                      <div className="d-flex justify-content-between mb-1">
                                        <span className="fw-bold small text-primary">Agent</span>
                                        <span className="x-small text-secondary">00:45</span>
                                      </div>
                                      <p className="small mb-0 text-dark">Absolutely! We specialize in tech-focused support with 24/7 coverage. We can certainly help you scale while maintaining high quality.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 text-center my-auto text-secondary">
                    <i className="bi bi-person-workspace fs-1 mb-2 text-muted d-block"></i>
                    <h5>No Lead Selected</h5>
                    <p className="small">Assign leads on the Sales page or select a lead to view details.</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 3. AI Performance Analytics & Pipeline Funnel */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6">
              <div className="card border-0 shadow-sm p-4 bg-white rounded-4 h-100">
                <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                  <i className="bi bi-funnel text-primary"></i> Sales Pipeline Stage Funnel
                </h5>
                <p className="text-secondary mb-4" style={{ fontSize: "12px" }}>Real-time status breakdown of assigned leads.</p>
                {(() => {
                  const counts = { New: 0, Connected: 0, Qualified: 0, Won: 0, Lost: 0 };
                  selectedAgent.leads.forEach(lead => {
                    const status = (lead.status || "").toUpperCase();
                    if (status.includes("NEW")) counts.New++;
                    else if (status.includes("CONNECTED") || status.includes("CONTACT")) counts.Connected++;
                    else if (status.includes("QUALIFIED")) counts.Qualified++;
                    else if (status.includes("WON")) counts.Won++;
                    else counts.Lost++;
                  });
                  const total = selectedAgent.leads.length || 1;
                  return (
                    <div className="d-flex flex-column gap-3">
                      {[
                        { label: "New Lead Contacts", count: counts.New, color: "bg-primary" },
                        { label: "Active Connections", count: counts.Connected, color: "bg-info" },
                        { label: "Qualified Opportunities", count: counts.Qualified, color: "bg-warning" },
                        { label: "Closed Won Deals", count: counts.Won, color: "bg-success" }
                      ].map((stage, idx) => {
                        const pct = Math.round((stage.count / total) * 100);
                        return (
                          <div key={idx}>
                            <div className="d-flex justify-content-between mb-1" style={{ fontSize: "13px" }}>
                              <span className="fw-semibold text-dark">{stage.label}</span>
                              <span className="text-secondary small fw-bold">{stage.count} ({pct}%)</span>
                            </div>
                            <div className="progress" style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "50px" }}>
                              <div className={`progress-bar ${stage.color}`} style={{ width: `${pct}%`, borderRadius: "50px" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card border-0 shadow-sm p-4 bg-white rounded-4 h-100">
                <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                  <i className="bi bi-cpu text-info"></i> AI Interaction & Quality Insights
                </h5>
                <p className="text-secondary mb-4" style={{ fontSize: "12px" }}>Deep learning evaluation of customer interactions.</p>
                {(() => {
                  const scores = selectedAgent.calls.map(c => c.aiScore || 0).filter(s => s > 0);
                  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
                  return (
                    <div className="d-flex flex-column justify-content-between h-100">
                      <div className="d-flex align-items-center gap-4 mb-3">
                        <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: "90px", height: "90px" }}>
                          <svg width="90" height="90" viewBox="0 0 36 36">
                            <path strokeDasharray="100, 100" strokeWidth="3" stroke="rgba(0,0,0,0.06)" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path strokeDasharray={`${averageScore}, 100`} strokeWidth="3" strokeLinecap="round" stroke="#00A76F" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="position-absolute text-center" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                            <span className="fw-bold text-dark fs-5">{averageScore}%</span>
                          </div>
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-1">AI Interaction Quality Score</h6>
                          <p className="text-secondary small mb-0">Based on tone analysis, customer sentiment, and objection-handling logs.</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-3" style={{ borderLeft: "4px solid #00A76F", backgroundColor: "#f8fafc" }}>
                        <div className="fw-semibold text-dark mb-1 d-flex align-items-center gap-1" style={{ fontSize: "13px" }}>
                          <i className="bi bi-patch-check text-success"></i> Objection-Handling Index
                        </div>
                        <p className="text-secondary mb-0" style={{ fontSize: "11.5px", lineHeight: "1.5" }}>
                          {averageScore > 80
                            ? "Excellent customer relationship tone & active listening skills. Objection handling index is outstanding."
                            : "Solid engagement metrics. Re-routing calls to handle objections on key pricing models could improve closing rates."}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 4. Assigned Pipelines & Leads Table */}
          <div className="card border-0 shadow-sm mb-4 rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                  <i className="bi bi-person-workspace text-primary"></i> Assigned Pipelines & Leads
                </h5>
                <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>{"Click any row to open that lead's full detail profile."}</p>
              </div>
              <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 py-1 small fw-bold">
                {selectedAgent.leads.length} Records
              </span>
            </div>
            <div className="card-body p-4 pt-2">
              {selectedAgent.leads.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-person-slash text-secondary opacity-50 fs-4 d-block mb-2"></i>
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
                        {["Full Name", "Company", "Status", "Source", "Phone", "Action"].map((h, i) => (
                          <th key={i} className={`text-secondary py-3 text-uppercase fw-bold ${i === 5 ? "text-end px-3" : i === 0 ? "px-3" : ""}`} style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAgent.leads.map((lead) => (
                        <tr key={lead.id} onClick={() => router.push(`/admin/leads/${lead.id}`)} style={{ cursor: "pointer" }}>
                          <td className="px-3 fw-bold text-dark small">{lead.name}</td>
                          <td className="small text-secondary">{lead.company || "—"}</td>
                          <td>
                            {(() => {
                              const isWon = lead.status === "CLOSED_WON" || lead.status === "WON";
                              const isLost = lead.status === "CLOSED_LOST" || lead.status === "LOST";
                              let bg = "rgba(0,167,111,0.12)", color = "#00a76f", label = lead.status;
                              if (isWon) { bg = "rgba(255,193,7,0.12)"; color = "#ffc107"; label = "WON"; }
                              else if (isLost) { bg = "rgba(220,53,69,0.12)"; color = "#dc3545"; label = "LOST"; }
                              else if (lead.status === "QUALIFIED") { bg = "rgba(13,110,253,0.12)"; color = "#0d6efd"; }
                              else if (lead.status === "CONTACTED") { bg = "rgba(23,162,184,0.12)"; color = "#17a2b8"; }
                              return <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ backgroundColor: bg, color, fontSize: "11px" }}>{label}</span>;
                            })()}
                          </td>
                          <td className="small text-secondary">{lead.source || "COLD_CALL"}</td>
                          <td className="small text-secondary font-monospace">{lead.phone}</td>
                          <td className="text-end px-3">
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/leads/${lead.id}`); }} className="btn btn-sm btn-outline-primary py-1 px-3 fw-bold" style={{ borderRadius: "50px", fontSize: "11px" }}>
                              <i className="bi bi-eye me-1"></i>View
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

          {/* 5. Call logs Table */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                  <i className="bi bi-telephone-outbound-fill text-info"></i> Interactive Call Logs & Analysis
                </h5>
                <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>{"Click any row to open that call's AI transcript and quality analysis."}</p>
              </div>
              <span className="badge bg-info bg-opacity-10 text-info rounded-pill px-2 py-1 small fw-bold">
                {selectedAgent.calls.length} Interactions
              </span>
            </div>
            <div className="card-body p-4 pt-2">
              {selectedAgent.calls.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-telephone-slash text-secondary opacity-50 fs-4 d-block mb-2"></i>
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
                        {["Date & Time", "Lead Contact", "Stage Reached", "AI Quality Score", "Duration", "Action"].map((h, i) => (
                          <th key={i} className={`text-secondary py-3 text-uppercase fw-bold ${i === 3 ? "text-center" : ""} ${i === 5 ? "text-end px-3" : i === 0 ? "px-3" : ""}`} style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAgent.calls.map((call) => (
                        <tr key={call.id} onClick={() => router.push(`/admin/calls/${call.id}`)} style={{ cursor: "pointer" }}>
                          <td className="px-3">
                            <div className="text-dark fw-semibold" style={{ fontSize: "14px" }}>{new Date(call.createdAt).toLocaleDateString()}</div>
                            <div className="text-muted" style={{ fontSize: "11.5px" }}>{new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          </td>
                          <td>
                            <div className="fw-bold text-primary small">{call.lead?.name || "Deleted Lead"}</div>
                            <span className="text-secondary" style={{ fontSize: "10.5px" }}>{call.lead?.company || "No Company"}</span>
                          </td>
                          <td className="small fw-bold text-dark">{call.stage}</td>
                          <td className="text-center">
                            <span className={`fw-bold small ${(call.aiScore || 0) > 70 ? "text-success" : "text-warning"}`}>{call.aiScore || 0}%</span>
                          </td>
                          <td className="small text-secondary font-monospace">{call.duration ? `${call.duration}s` : "0s"}</td>
                          <td className="text-end px-3">
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/calls/${call.id}`); }} className="btn btn-sm btn-outline-primary py-1 px-3 fw-bold d-inline-flex align-items-center" style={{ borderRadius: "50px", fontSize: "11px" }}>
                              <i className="bi bi-eye me-1"></i>View
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
          <i className="bi bi-people fs-1 text-muted mb-3 d-block"></i>
          <h5 className="fw-bold text-dark">No Active Agents Found</h5>
          <p className="text-secondary small mb-0">There are currently no agents registered or active in the database system.</p>
        </div>
      )}

      {/* MODALS */}

      {showOutcomeModal && activeLead && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 10050, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(6px)" }}>
          <div className="card border-0 shadow-lg p-4 bg-white position-relative" style={{ maxWidth: "420px", width: "90%", borderRadius: "16px" }}>
            <button onClick={() => setShowOutcomeModal(false)} className="position-absolute border-0 bg-transparent text-secondary" style={{ top: "16px", right: "16px", cursor: "pointer" }}>
              <i className="bi bi-x-lg"></i>
            </button>
            <div className="text-center">
              <div className="display-4 mb-2">🤝</div>
              <h5 className="fw-bold text-dark">Close Lead Outcome</h5>
              <p className="text-secondary small mb-4">Select the final outcome of this sales interaction.</p>
              <div className="d-flex gap-3 justify-content-center">
                <button onClick={() => handleConfirmOutcome("WON")} className="btn btn-success px-4 py-2 fw-bold" style={{ borderRadius: "50px" }}>🏆 Deal Won</button>
                <button onClick={() => handleConfirmOutcome("LOST")} className="btn btn-outline-danger px-4 py-2 fw-bold" style={{ borderRadius: "50px" }}>❌ Deal Lost</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCelebration && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-center" style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(10px)" }}>
          {Array.from({ length: 60 }).map((_, idx) => {
            const p = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
            return (
              <div key={idx} className="confetti-particle" style={{ left: `${p(idx+1)*100}%`, animationDelay: `${p(idx+2)*2.5}s`, backgroundColor: ["#00A76F","#ffc107","#0d6efd","#e91e63","#9c27b0"][Math.floor(p(idx+4)*5)], width: `${p(idx+3)*8+6}px`, height: `${p(idx+3)*8+6}px` }} />
            );
          })}
          <div className="card border-0 shadow-lg p-5 bg-white text-center position-relative" style={{ maxWidth: "450px", width: "90%", borderRadius: "20px" }}>
            <button onClick={() => setShowCelebration(false)} className="position-absolute border-0 bg-transparent text-secondary" style={{ top: "16px", right: "16px", cursor: "pointer" }}><i className="bi bi-x-lg"></i></button>
            <div className="display-3 mb-3">🎉 🏆 🎉</div>
            <h2 className="fw-bold text-dark mb-2">Congratulations!</h2>
            <p className="fw-semibold text-success mb-3" style={{ fontSize: "1.3rem" }}>This Deal is officially WON! 🚀</p>
            <p className="text-secondary small mb-0">Updating records and syncing dashboard performance logs...</p>
          </div>
        </div>
      )}

      {showSympathy && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-center" style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(10px)" }}>
          <div className="card border-0 shadow-lg p-5 bg-white text-center position-relative" style={{ maxWidth: "450px", width: "90%", borderRadius: "20px" }}>
            <button onClick={() => setShowSympathy(false)} className="position-absolute border-0 bg-transparent text-secondary" style={{ top: "16px", right: "16px", cursor: "pointer" }}><i className="bi bi-x-lg"></i></button>
            <div className="display-3 mb-3">💪 ❤️ 🤝</div>
            <h2 className="fw-bold text-dark mb-2">Keep Pushing!</h2>
            <p className="fw-semibold text-danger mb-3" style={{ fontSize: "1.3rem" }}>{"Every 'No' brings us closer to a 'Yes'!"}</p>
            <p className="text-secondary small mb-0">{"Recording outcome and updating sales logs. We'll win the next one!"}</p>
          </div>
        </div>
      )}

      {syncStatus !== "idle" && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)", zIndex: 10070 }}>
          <div className="card border-0 shadow-lg p-5 bg-white text-center" style={{ maxWidth: "380px", width: "90%", borderRadius: "24px" }}>
            {syncStatus === "syncing" && (
              <div className="d-flex flex-column align-items-center py-2">
                <div className="spinner-border text-primary mb-4" style={{ width: "3.5rem", height: "3.5rem", borderWidth: "4px" }}></div>
                <h5 className="fw-bold text-dark mb-1">Syncing with Zoho CRM</h5>
                <p className="text-secondary small mb-0">Updating lead lifecycle status...</p>
              </div>
            )}
            {syncStatus === "success" && (
              <>
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: "72px", height: "72px" }}>
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "2.5rem" }}></i>
                  </div>
                </div>
                <h5 className="fw-bold text-dark mb-1">Sync Successful!</h5>
                <p className="text-secondary small mb-3">Lead status has been updated in Zoho CRM.</p>
                <button onClick={() => setSyncStatus("idle")} className="btn btn-success w-100 fw-bold" style={{ borderRadius: "12px" }}>Done</button>
              </>
            )}
            {syncStatus === "error" && (
              <>
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: "72px", height: "72px" }}>
                    <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: "2.5rem" }}></i>
                  </div>
                </div>
                <h5 className="fw-bold text-dark mb-1">Sync Failed</h5>
                <p className="text-secondary small mb-3">Could not sync with Zoho CRM. Check your credentials.</p>
                <button onClick={() => setSyncStatus("idle")} className="btn btn-danger w-100 fw-bold" style={{ borderRadius: "12px" }}>Close</button>
              </>
            )}
          </div>
        </div>
      )}

      {isEditingLead && activeLead && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="card border-0 shadow-lg p-4 bg-white" style={{ maxWidth: "500px", width: "90%", borderRadius: "16px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-pencil-square text-primary"></i> Edit Lead Profile
              </h5>
              <button onClick={() => setIsEditingLead(false)} className="border-0 bg-transparent text-secondary" style={{ cursor: "pointer" }}>
                <i className="bi bi-x-lg fs-5"></i>
              </button>
            </div>
            <form onSubmit={handleSaveLead}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Full Name</label>
                  <input type="text" required value={editLeadForm.name} onChange={(e) => setEditLeadForm({...editLeadForm, name: e.target.value})} className="form-control" />
                </div>
                <div className="col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Phone</label>
                  <input type="text" required value={editLeadForm.phone} onChange={(e) => setEditLeadForm({...editLeadForm, phone: e.target.value})} className="form-control" />
                </div>
                <div className="col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Email</label>
                  <input type="email" value={editLeadForm.email} onChange={(e) => setEditLeadForm({...editLeadForm, email: e.target.value})} className="form-control" />
                </div>
                <div className="col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Company</label>
                  <input type="text" value={editLeadForm.company} onChange={(e) => setEditLeadForm({...editLeadForm, company: e.target.value})} className="form-control" />
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Source</label>
                  <select value={editLeadForm.source} onChange={(e) => setEditLeadForm({...editLeadForm, source: e.target.value})} className="form-select">
                    <option value="COLD_CALL">Cold Call</option>
                    <option value="WEBSITE">Website</option>
                    <option value="REFERRAL">Referral</option>
                  </select>
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Stage</label>
                  <select value={editLeadForm.status} onChange={(e) => setEditLeadForm({...editLeadForm, status: e.target.value})} className="form-select">
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              </div>
              <div className="d-flex gap-2 mt-4">
                <button type="button" onClick={() => setIsEditingLead(false)} className="btn btn-light border w-100 py-2 fw-semibold" style={{ borderRadius: "10px" }}>Cancel</button>
                <button type="submit" disabled={isPending} className="btn btn-primary w-100 py-2 fw-bold" style={{ borderRadius: "10px" }}>
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoggingCall && activeLead && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="card border-0 shadow-lg p-4 bg-white" style={{ maxWidth: "550px", width: "90%", borderRadius: "16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-telephone-plus text-success"></i> Log New Interaction
              </h5>
              <button onClick={() => setIsLoggingCall(false)} className="border-0 bg-transparent text-secondary" style={{ cursor: "pointer" }}>
                <i className="bi bi-x-lg fs-5"></i>
              </button>
            </div>
            <p className="text-secondary small mb-3">Log a conversation with <strong>{activeLead.name}</strong>.</p>
            <form onSubmit={handleSaveLoggedCall}>
              <div className="row g-3">
                <div className="col-md-6 col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Call Status</label>
                  <select value={logCallForm.status} onChange={(e) => setLogCallForm({...logCallForm, status: e.target.value})} className="form-select">
                    <option value="CONNECTED">Connected</option>
                    <option value="MISSED">Missed Call</option>
                    <option value="VOICEMAIL">Voicemail</option>
                  </select>
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Stage</label>
                  <select value={logCallForm.stage} onChange={(e) => setLogCallForm({...logCallForm, stage: e.target.value})} className="form-select">
                    {CALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Duration (seconds)</label>
                  <input type="number" required min="0" value={logCallForm.duration} onChange={(e) => setLogCallForm({...logCallForm, duration: e.target.value})} className="form-control" />
                </div>
                <div className="col-md-6 col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>AI Score (0-100)</label>
                  <input type="number" required min="0" max="100" value={logCallForm.aiScore} onChange={(e) => setLogCallForm({...logCallForm, aiScore: e.target.value})} className="form-control" />
                </div>
                <div className="col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Notes</label>
                  <textarea rows={2} value={logCallForm.notes} onChange={(e) => setLogCallForm({...logCallForm, notes: e.target.value})} className="form-control" placeholder="Key highlights..."></textarea>
                </div>
                <div className="col-12">
                  <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Transcript</label>
                  <textarea rows={3} value={logCallForm.transcript} onChange={(e) => setLogCallForm({...logCallForm, transcript: e.target.value})} className="form-control font-monospace" placeholder="Agent: Hello... Customer: Yes..."></textarea>
                </div>
              </div>
              <div className="d-flex gap-2 mt-4">
                <button type="button" onClick={() => setIsLoggingCall(false)} className="btn btn-light border w-100 py-2 fw-semibold" style={{ borderRadius: "10px" }}>Cancel</button>
                <button type="submit" disabled={isPending} className="btn btn-success w-100 py-2 fw-bold" style={{ borderRadius: "10px" }}>
                  {isPending ? "Logging..." : "Log Interaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCallDetail && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="card border-0 shadow-lg p-4 bg-white" style={{ maxWidth: "600px", width: "95%", borderRadius: "16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-medical text-info"></i> Interaction Quality Analysis
              </h5>
              <button onClick={() => { setSelectedCallDetail(null); setIsEditingCallDetail(false); }} className="border-0 bg-transparent text-secondary" style={{ cursor: "pointer" }}>
                <i className="bi bi-x-lg fs-5"></i>
              </button>
            </div>

            {!isEditingCallDetail ? (
              <div className="d-flex flex-column gap-3">
                <div className="row g-2 text-center text-md-start">
                  <div className="col-md-3 col-6"><span className="text-secondary small d-block">Stage</span><strong className="text-dark small">{selectedCallDetail.stage}</strong></div>
                  <div className="col-md-3 col-6"><span className="text-secondary small d-block">Duration</span><strong className="text-dark small font-monospace">{selectedCallDetail.duration || 0}s</strong></div>
                  <div className="col-md-3 col-6"><span className="text-secondary small d-block">Status</span><strong className="text-dark small">{selectedCallDetail.status}</strong></div>
                  <div className="col-md-3 col-6"><span className="text-secondary small d-block">AI Score</span><strong className={`small fw-bold ${(selectedCallDetail.aiScore || 0) > 75 ? "text-success" : "text-warning"}`}>{selectedCallDetail.aiScore || 0}%</strong></div>
                </div>
                <hr className="my-2 opacity-20" />
                <div>
                  <h6 className="fw-bold text-dark mb-1" style={{ fontSize: "13px" }}>Notes</h6>
                  <p className="bg-light p-3 rounded-2 text-secondary mb-0" style={{ fontSize: "13.5px" }}>{selectedCallDetail.notes || "No notes written."}</p>
                </div>
                <div>
                  <h6 className="fw-bold text-info mb-1 d-flex align-items-center gap-1" style={{ fontSize: "13px" }}><i className="bi bi-cpu"></i> AI Sentiment</h6>
                  <p className="bg-info bg-opacity-5 border-start border-3 border-info p-3 rounded-end-2 text-secondary mb-0" style={{ fontSize: "13.5px" }}>{selectedCallDetail.analysis || "AI evaluating sentiment patterns..."}</p>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1" style={{ fontSize: "13px" }}>Transcript</h6>
                  <div className="bg-dark p-3 rounded-2 text-light font-monospace overflow-auto" style={{ maxHeight: "150px", fontSize: "12px", whiteSpace: "pre-wrap" }}>{selectedCallDetail.transcript || "— No Transcript Captured —"}</div>
                </div>
                <div className="d-flex gap-2 mt-2">
                  <button type="button" onClick={() => handleOpenEditCall(selectedCallDetail)} className="btn btn-outline-primary w-100 py-2 fw-semibold" style={{ borderRadius: "10px" }}>
                    <i className="bi bi-pencil-square me-1"></i> Edit Record
                  </button>
                  <button type="button" onClick={() => { setSelectedCallDetail(null); setIsEditingCallDetail(false); }} className="btn btn-secondary w-100 py-2 fw-bold" style={{ borderRadius: "10px" }}>Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateCall}>
                <div className="row g-3">
                  <div className="col-md-6 col-12">
                    <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Status</label>
                    <select value={editCallForm.status} onChange={(e) => setEditCallForm({...editCallForm, status: e.target.value})} className="form-select">
                      <option value="CONNECTED">Connected</option>
                      <option value="MISSED">Missed</option>
                      <option value="VOICEMAIL">Voicemail</option>
                    </select>
                  </div>
                  <div className="col-md-6 col-12">
                    <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Stage</label>
                    <select value={editCallForm.stage} onChange={(e) => setEditCallForm({...editCallForm, stage: e.target.value})} className="form-select">
                      {CALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6 col-12">
                    <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Duration</label>
                    <input type="number" required min="0" value={editCallForm.duration} onChange={(e) => setEditCallForm({...editCallForm, duration: e.target.value})} className="form-control" disabled />
                  </div>
                  <div className="col-md-6 col-12">
                    <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>AI Score</label>
                    <input type="number" required min="0" max="100" value={editCallForm.aiScore} onChange={(e) => setEditCallForm({...editCallForm, aiScore: e.target.value})} className="form-control" />
                  </div>
                  <div className="col-12">
                    <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Notes</label>
                    <textarea rows={2} value={editCallForm.notes} onChange={(e) => setEditCallForm({...editCallForm, notes: e.target.value})} className="form-control"></textarea>
                  </div>
                  <div className="col-12">
                    <label className="form-label text-secondary fw-bold" style={{ fontSize: "11px" }}>Transcript</label>
                    <textarea rows={3} value={editCallForm.transcript} onChange={(e) => setEditCallForm({...editCallForm, transcript: e.target.value})} className="form-control font-monospace"></textarea>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button type="button" onClick={() => setIsEditingCallDetail(false)} className="btn btn-light border w-100 py-2 fw-semibold" style={{ borderRadius: "10px" }}>Back</button>
                  <button type="submit" disabled={isPending} className="btn btn-primary w-100 py-2 fw-bold" style={{ borderRadius: "10px" }}>
                    {isPending ? "Saving..." : "Save Documentation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .bubble-step { position: relative; cursor: pointer; transition: all 0.2s ease; }
        .bubble-box {
          width: 38px; height: 28px; background: #fff; border: 1px solid #cbd5e1;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #637381; margin: 0 auto 12px;
          position: relative; transition: all 0.3s ease;
        }
        .bubble-pointer {
          position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%) rotate(45deg);
          width: 8px; height: 8px; background: #fff; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;
        }
        .bubble-dot {
          width: 12px; height: 12px; background: #fff; border: 2px solid #cbd5e1;
          border-radius: 50%; margin: 0 auto; position: relative; z-index: 2; transition: all 0.3s ease;
        }
        .bubble-step.reached .bubble-box { background: #198754; color: #fff; border-color: #198754; }
        .bubble-step.reached .bubble-pointer { background: #198754; border-color: #198754; }
        .bubble-step.reached .bubble-dot { background: #198754; border-color: #fff; }
        .bubble-step.active .bubble-box { background: #0d6efd; color: #fff; border-color: #0d6efd; }
        .bubble-step.active .bubble-pointer { background: #0d6efd; border-color: #0d6efd; }
        .bubble-step.active .bubble-dot { background: #0d6efd; border-color: #fff; }
        .bubble-step.reached-call .bubble-box { background: #00A76F; color: #fff; border-color: #00A76F; }
        .bubble-step.reached-call .bubble-pointer { background: #00A76F; border-color: #00A76F; }
        .bubble-step.reached-call .bubble-dot { background: #00A76F; border-color: #fff; }
        .bubble-step.active-call .bubble-box { background: #0d6efd; color: #fff; border-color: #0d6efd; }
        .bubble-step.active-call .bubble-pointer { background: #0d6efd; border-color: #0d6efd; }
        .bubble-step.active-call .bubble-dot { background: #0d6efd; border-color: #fff; }
        .bubble-label { font-size: 10.5px; max-width: 85px; margin: 0 auto; line-height: 1.25; }
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .confetti-particle { position: fixed; top: -20px; z-index: 99999; border-radius: 50%; animation: confetti-fall 3.5s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade { animation: fadeIn 0.4s ease-out; }
        .lead-list-btn {
          border-radius: 0px !important;
        }
        .lead-list-btn.active-lead-item {
          background-color: rgba(0, 167, 111, 0.05) !important;
        }
        .search-input-field {
          padding-left: 36px !important;
        }
        @media (min-width: 768px) {
          .border-start-md {
            border-left: 1px solid #eef2f6 !important;
          }
        }
      `}</style>
    </div>
  );
}
