"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

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
    aiScore: number | null;
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div 
        className="card border-0 shadow-lg p-3 bg-white" 
        style={{ 
          maxWidth: "320px", 
          borderRadius: "12px", 
          zIndex: 1000, 
          fontSize: "12.5px",
          borderLeft: "4px solid #0d6efd"
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
          <span className="fw-bold text-dark">{data.leadName}</span>
          <span className="badge bg-primary rounded-pill px-2.5 py-1" style={{ fontSize: "10px" }}>{data.stage}</span>
        </div>
        <div className="space-y-1 text-secondary">
          <div className="mb-1"><span className="fw-bold text-dark">Company:</span> {data.company}</div>
          <div className="mb-1"><span className="fw-bold text-dark">Date & Time:</span> {data.date} at {data.time}</div>
          <div className="mb-1"><span className="fw-bold text-dark">Duration:</span> {data.duration}</div>
          <div className="d-flex align-items-center gap-1.5 mt-2 mb-2 text-dark fw-bold" style={{ fontSize: "13px" }}>
            <i className="bi bi-robot text-primary"></i>
            <span>AI Score:</span> 
            <span className="text-success">{data.score}%</span>
          </div>
          <div className="mt-2 pt-2 border-top">
            <span className="fw-bold text-dark d-block mb-1" style={{ fontSize: "11px" }}>AI Summary:</span>
            <p className="mb-0 text-muted small" style={{ lineHeight: "1.4", whiteSpace: "pre-wrap" }}>
              {data.analysis}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface AgentDetailsWorkspaceProps {
  agent: Agent;
}

export default function AgentDetailsWorkspace({ agent }: AgentDetailsWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"leads" | "calls" | "graph">("leads");
  
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [callSearchQuery, setCallSearchQuery] = useState("");
  const [selectedCallDetail, setSelectedCallDetail] = useState<CallLog | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = useMemo(() => {
    const sorted = [...agent.calls].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return sorted.map((call, index) => {
      const durationMin = Math.floor((call.duration || 0) / 60);
      const durationSec = (call.duration || 0) % 60;
      return {
        seq: index + 1,
        name: `Call #${index + 1}`,
        score: call.aiScore || 0,
        date: new Date(call.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        time: new Date(call.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        leadName: call.lead?.name || "Unknown",
        company: call.lead?.company || "N/A",
        duration: `${durationMin}m ${durationSec}s`,
        stage: call.stage,
        analysis: call.analysis || call.notes || "No notes recorded",
        originalCall: call
      };
    });
  }, [agent.calls]);

  // Stats computation
  const stats = useMemo(() => {
    const totalLeads = agent.leads.length;
    const totalCalls = agent.calls.length;
    const wonLeads = agent.leads.filter(
      (l) => l.status === "WON" || l.status === "CLOSED_WON"
    ).length;

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const totalDuration = agent.calls.reduce((acc, c) => acc + (c.duration || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    const callsWithScore = agent.calls.filter(c => c.aiScore !== null);
    const totalScore = callsWithScore.reduce((acc, c) => acc + (c.aiScore || 0), 0);
    const avgAiScore = callsWithScore.length > 0 ? Math.round(totalScore / callsWithScore.length) : 0;

    return {
      totalLeads,
      totalCalls,
      wonLeads,
      conversionRate,
      avgDuration,
      avgAiScore,
    };
  }, [agent]);

  // Attended leads count
  const attendedLeadsCount = useMemo(() => {
    return agent.leads.filter(lead => lead.calls && lead.calls.length > 0).length;
  }, [agent.leads]);

  // Search filter lists
  const filteredLeads = useMemo(() => {
    if (!leadSearchQuery) return agent.leads;
    const q = leadSearchQuery.toLowerCase();
    return agent.leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.company || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        l.phone.includes(q)
    );
  }, [agent.leads, leadSearchQuery]);

  const filteredCalls = useMemo(() => {
    if (!callSearchQuery) return agent.calls;
    const q = callSearchQuery.toLowerCase();
    return agent.calls.filter(
      (c) =>
        c.lead.name.toLowerCase().includes(q) ||
        (c.notes || "").toLowerCase().includes(q) ||
        (c.stage || "").toLowerCase().includes(q)
    );
  }, [agent.calls, callSearchQuery]);

  return (
    <div className="d-flex flex-column gap-4 animate-fade">
      
      {/* Metrics Row (now at the top, padding fixed to p-4) */}
      <div className="row g-3">
        {[
          { title: "Leads Assigned", count: stats.totalLeads, icon: "bi-person-badge text-primary", label: "Assigned contacts" },
          { title: "Calls Logged", count: stats.totalCalls, icon: "bi-telephone-outbound text-info", label: "Outbound dials" },
          { title: "Avg AI Call Score", count: stats.totalCalls > 0 ? `${stats.avgAiScore}%` : "—", icon: "bi-robot text-warning", label: "Speech analytics rank" },
          { title: "Conversion Rate", count: `${stats.conversionRate}%`, icon: "bi-graph-up-arrow text-success", label: "Deals won/leads ratio" }
        ].map((c, i) => (
          <div key={i} className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm p-4 bg-white h-100" style={{ borderRadius: "16px" }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-secondary fw-semibold">{c.title}</span>
                <i className={`bi ${c.icon} fs-5`}></i>
              </div>
              <h3 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.5px" }}>{c.count}</h3>
              <span className="x-small text-muted">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Selectors */}
      <div className="d-flex gap-2 border-bottom pb-1">
        {[
          { id: "leads", label: `Assigned Leads (${agent.leads.length})`, icon: "bi-people" },
          { id: "calls", label: `Call History (${agent.calls.length})`, icon: "bi-telephone" },
          { id: "graph", label: `Performance Graph`, icon: "bi-graph-up" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className="btn btn-sm border-0 px-3 py-2 fw-bold d-flex align-items-center gap-2 position-relative text-nowrap"
            style={{
              color: activeTab === t.id ? "#00A76F" : "#637381",
              fontSize: "13.5px"
            }}
          >
            <i className={`bi ${t.icon}`}></i>
            <span>{t.label}</span>
            {activeTab === t.id && (
              <span
                className="position-absolute bottom-0 start-0 w-100"
                style={{ height: "3px", backgroundColor: "#00A76F", borderRadius: "10px" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Assigned Leads */}
        {activeTab === "leads" && (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
              <div>
                <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "15.5px" }}>Assigned Contacts</h5>
                <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>Leads list assigned to this agent.</p>
              </div>

              {/* Lead Search box */}
              <div className="search-box m-0" style={{ width: "240px", height: "38px" }}>
                <i className="bi bi-search text-secondary" style={{ fontSize: "13px" }}></i>
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>

            {/* Attendance stats banner */}
            <div className="mx-4 mb-3 p-3 bg-light rounded-3 d-flex flex-wrap align-items-center gap-4">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px" }}>
                  <i className="bi bi-people-fill"></i>
                </div>
                <div>
                  <div className="x-small text-muted fw-bold uppercase" style={{ fontSize: "10px" }}>Assigned Leads</div>
                  <div className="fw-bold text-dark">{agent.leads.length}</div>
                </div>
              </div>
              <div className="border-start d-none d-sm-block" style={{ height: "28px" }}></div>
              <div className="d-flex align-items-center gap-2">
                <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px" }}>
                  <i className="bi bi-telephone-check-fill"></i>
                </div>
                <div>
                  <div className="x-small text-muted fw-bold uppercase" style={{ fontSize: "10px" }}>Leads Attended</div>
                  <div className="fw-bold text-dark">{attendedLeadsCount}</div>
                </div>
              </div>
              <div className="border-start d-none d-sm-block" style={{ height: "28px" }}></div>
              <div className="d-flex align-items-center gap-2">
                <div className="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px" }}>
                  <i className="bi bi-telephone-x-fill"></i>
                </div>
                <div>
                  <div className="x-small text-muted fw-bold uppercase" style={{ fontSize: "10px" }}>Not Attended Yet</div>
                  <div className="fw-bold text-dark">{agent.leads.length - attendedLeadsCount}</div>
                </div>
              </div>
            </div>

            <div className="card-body p-4 pt-2">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-5 text-secondary small">
                  No assigned leads match this search.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0 small text-secondary">Lead Name</th>
                        <th className="border-0 small text-secondary">Company</th>
                        <th className="border-0 small text-secondary">Status</th>
                        <th className="border-0 small text-secondary">Lead Temperature</th>
                        <th className="border-0 small text-secondary">Calls Made</th>
                        <th className="border-0 small text-secondary">Source</th>
                        <th className="border-0 small text-secondary text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => {
                        const isWon = lead.status === "WON" || lead.status === "CLOSED_WON";
                        const isLost = lead.status === "LOST" || lead.status === "CLOSED_LOST";

                        let pillBg = "rgba(0, 167, 111, 0.12)";
                        let pillColor = "#00a76f";
                        if (isWon) {
                          pillBg = "rgba(255, 193, 7, 0.12)";
                          pillColor = "#ffc107";
                        } else if (isLost) {
                          pillBg = "rgba(220, 53, 69, 0.12)";
                          pillColor = "#dc3545";
                        } else if (lead.status === "QUALIFIED") {
                          pillBg = "rgba(13, 110, 253, 0.12)";
                          pillColor = "#0d6efd";
                        } else if (lead.status === "CONTACTED") {
                          pillBg = "rgba(23, 162, 184, 0.12)";
                          pillColor = "#17a2b8";
                        }

                        // Determine Temperature: Hot, Warm, Cold
                        const hasCalls = lead.calls && lead.calls.length > 0;
                        const maxAiScore = hasCalls
                          ? Math.max(...lead.calls.map(c => c.aiScore || 0))
                          : 0;
                        
                        let tempLabel = "Cold";
                        let tempColor = "#0284c7"; // Cold Blue
                        let tempBg = "rgba(2, 132, 199, 0.12)";
                        let tempIcon = "❄️";

                        if (isWon || maxAiScore >= 80) {
                          tempLabel = "Hot";
                          tempColor = "#dc3545"; // Hot Red
                          tempBg = "rgba(220, 53, 69, 0.12)";
                          tempIcon = "🔥";
                        } else if (lead.status === "QUALIFIED" || lead.status === "CONTACTED" || maxAiScore >= 50) {
                          tempLabel = "Warm";
                          tempColor = "#f59e0b"; // Warm Orange
                          tempBg = "rgba(245, 158, 11, 0.12)";
                          tempIcon = "☀️";
                        }

                        return (
                          <tr key={lead.id}>
                            <td>
                              <div>
                                <div className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>{lead.name}</div>
                                <div className="text-secondary" style={{ fontSize: "11.5px" }}>{lead.phone}</div>
                              </div>
                            </td>
                            <td className="text-secondary fw-semibold" style={{ fontSize: "13.5px" }}>
                              {lead.company || "—"}
                            </td>
                            <td>
                              <span className="badge rounded-pill px-3 py-1 fw-bold" style={{ backgroundColor: pillBg, color: pillColor, fontSize: "10.5px" }}>
                                {lead.status}
                              </span>
                            </td>
                            <td>
                              <span className="badge rounded-pill px-3 py-1 fw-bold" style={{ backgroundColor: tempBg, color: tempColor, fontSize: "10.5px" }}>
                                <span className="me-1">{tempIcon}</span>{tempLabel}
                              </span>
                            </td>
                            <td>
                              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                                <i className="bi bi-telephone-outbound text-secondary me-2" style={{ fontSize: "12px" }}></i>
                                {lead.calls.length} calls
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-light text-secondary border px-2 py-1 text-uppercase font-monospace" style={{ fontSize: "10px" }}>
                                {lead.source || "WEBSITE"}
                              </span>
                            </td>
                            <td className="text-end">
                              <Link
                                href={`/admin/leads/${lead.id}`}
                                className="btn btn-sm btn-light border-0 text-primary"
                                title="View Lead Details"
                              >
                                <i className="bi bi-eye"></i>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Call History */}
        {activeTab === "calls" && (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
              <div>
                <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "15.5px" }}>Outbound Call Interactions</h5>
                <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>History of dialed calls and speech metrics.</p>
              </div>

              {/* Call search box */}
              <div className="search-box m-0" style={{ width: "240px", height: "38px" }}>
                <i className="bi bi-search text-secondary" style={{ fontSize: "13px" }}></i>
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={callSearchQuery}
                  onChange={(e) => setCallSearchQuery(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>

            <div className="card-body p-4 pt-2">
              {filteredCalls.length === 0 ? (
                <div className="text-center py-5 text-secondary small">
                  No outbound call logs match this search.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0 small text-secondary">Dialed Lead</th>
                        <th className="border-0 small text-secondary">Call Duration</th>
                        <th className="border-0 small text-secondary">Outcome Stage</th>
                        <th className="border-0 small text-secondary">AI Score</th>
                        <th className="border-0 small text-secondary">Date & Time</th>
                        <th className="border-0 small text-secondary text-end">Transcript</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCalls.map((call) => {
                        const durationMin = Math.floor((call.duration || 0) / 60);
                        const durationSec = (call.duration || 0) % 60;
                        const durationStr = `${durationMin}m ${durationSec}s`;

                        return (
                          <tr key={call.id}>
                            <td>
                              <div>
                                <div className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>{call.lead.name}</div>
                                <div className="text-secondary" style={{ fontSize: "11.5px" }}>{call.lead.company || "—"}</div>
                              </div>
                            </td>
                            <td className="text-secondary fw-semibold" style={{ fontSize: "13.5px" }}>
                              {durationStr}
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border px-2 py-1 fw-bold" style={{ fontSize: "10.5px" }}>
                                {call.stage}
                              </span>
                            </td>
                            <td>
                              <div className="fw-bold text-dark d-flex align-items-center gap-1">
                                <i className="bi bi-robot text-primary" style={{ fontSize: "12px" }}></i>
                                <span>{call.aiScore || 0}%</span>
                              </div>
                            </td>
                            <td className="text-secondary small">
                              {new Date(call.createdAt).toLocaleString()}
                            </td>
                            <td className="text-end">
                              <button
                                onClick={() => setSelectedCallDetail(call)}
                                className="btn btn-sm btn-light border-0 text-primary px-3 py-1 fw-bold d-inline-flex align-items-center gap-2"
                                style={{ borderRadius: "8px", fontSize: "12px" }}
                              >
                                <i className="bi bi-journal-text"></i>
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Performance Graph */}
        {activeTab === "graph" && (
          <div className="card border-0 shadow-sm bg-white p-4" style={{ borderRadius: "16px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <i className="bi bi-graph-up text-primary"></i> Call Quality Timeline
                </h5>
                <p className="text-secondary mb-0 small">Chronological trend of AI call validation scores and interaction outcomes.</p>
              </div>
              <div className="bg-light px-3 py-1.5 rounded-pill d-flex align-items-center gap-2">
                <span className="badge bg-primary rounded-circle" style={{ width: "8px", height: "8px", padding: 0 }}></span>
                <span className="x-small fw-bold text-secondary">AI Score Trend</span>
              </div>
            </div>

            <div style={{ height: "320px", width: "100%" }}>
              {isMounted ? (
                chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#0d6efd" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        stroke="#94a3b8" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        ticks={[0, 20, 40, 60, 80, 100]}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#0d6efd" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#scoreColor)" 
                        activeDot={{ r: 6, style: { fill: '#0d6efd', strokeWidth: 2 } }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center py-5 text-secondary">
                    <i className="bi bi-telephone-x fs-2 text-muted mb-2"></i>
                    <div className="small fw-semibold">No calls logged yet</div>
                    <div className="x-small text-muted">The quality timeline will display once outbound calls are executed.</div>
                  </div>
                )
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading chart...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Transcript Details Popup Modal */}
      {selectedCallDetail && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(5px)"
          }}
        >
          <div
            className="card border-0 shadow-lg p-4 bg-white"
            style={{
              maxWidth: "600px",
              width: "95%",
              borderRadius: "20px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3 flex-shrink-0">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <i className="bi bi-robot fs-5"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-0">Speech Transcript & AI Notes</h5>
                  <span className="text-secondary x-small">Lead: {selectedCallDetail.lead.name} • Stage: {selectedCallDetail.stage}</span>
                </div>
              </div>
              <button onClick={() => setSelectedCallDetail(null)} className="btn-close" style={{ outline: "none" }}></button>
            </div>

            {/* Scrollable Body */}
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "6px" }} className="custom-scrollbar">
              {/* AI Summary Block */}
              <div className="bg-light rounded-3 p-3 mb-4 border-start border-3 border-warning">
                <h6 className="fw-bold text-warning mb-2 d-flex align-items-center gap-2 small text-uppercase tracking-wider">
                  <i className="bi bi-journal-text"></i>
                  <span>Analysis Summary</span>
                </h6>
                <p className="text-dark small mb-0 fw-medium" style={{ lineHeight: "1.5" }}>
                  {selectedCallDetail.analysis || "No automatic AI analysis summaries were generated during this call interaction."}
                </p>
              </div>

              {/* Transcript Speech Block */}
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 small text-secondary text-uppercase tracking-wider">
                <i className="bi bi-mic text-danger"></i>
                <span>Conversation Transcript</span>
              </h6>
              <div className="p-3 bg-light rounded-3 border overflow-auto mb-4" style={{ maxHeight: "250px", backgroundColor: "#fafafa" }}>
                {selectedCallDetail.transcript ? (
                  <div className="d-flex flex-column gap-3">
                    {selectedCallDetail.transcript.split("\n").map((line, idx) => {
                      const isAgentLine = line.toLowerCase().startsWith("agent:") || line.toLowerCase().startsWith("rep:") || line.toLowerCase().startsWith("sales:");
                      const textCleaned = line.replace(/^(agent|rep|sales|customer|lead|client):\s*/i, "");
                      return (
                        <div key={idx} className={`d-flex flex-column ${isAgentLine ? 'align-items-end' : 'align-items-start'}`}>
                          <span className="x-small text-muted mb-1 fw-bold">{isAgentLine ? 'Sales Agent' : selectedCallDetail.lead.name}</span>
                          <div
                            className={`p-2 px-3 small ${isAgentLine ? 'bg-primary text-white' : 'bg-white border text-dark'}`}
                            style={{
                              borderRadius: isAgentLine ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                              maxWidth: "85%"
                            }}
                          >
                            {textCleaned || line}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-secondary small">
                    Raw transcript was not processed for this call session.
                  </div>
                )}
              </div>

              {/* Customer Notes */}
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 small text-secondary text-uppercase tracking-wider">
                <i className="bi bi-clipboard-check text-success"></i>
                <span>Representative Notes</span>
              </h6>
              <div className="border rounded-3 p-3 mb-4" style={{ backgroundColor: "#ffffff" }}>
                <p className="text-dark small mb-0 fw-medium">
                  {selectedCallDetail.notes || "No custom agent notes recorded."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 border-top pt-3 d-flex justify-content-end flex-shrink-0">
              <button
                onClick={() => setSelectedCallDetail(null)}
                className="btn btn-secondary px-4 py-2 small fw-bold text-white border-0"
                style={{ borderRadius: "10px", backgroundColor: "#6c757d" }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
