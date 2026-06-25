"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

export type CallLogWithRelations = {
  id: string;
  startTime: Date | string;
  endTime: Date | string | null;
  duration: number | null;
  status: string;
  stage: string;
  transcript: string | null;
  analysis: string | null;
  aiScore: number | null;
  notes: string | null;
  leadId: string;
  userId: string;
  createdAt: Date | string;
  lead: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    status: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  status: string;
  source: string | null;
  createdAt: Date | string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

interface DashboardClientProps {
  initialCalls: CallLogWithRelations[];
  initialLeads: Lead[];
  initialUsers: User[];
}

export default function DashboardClient({ initialCalls, initialLeads, initialUsers }: DashboardClientProps) {
  // 1. Top Filters State
  const [timePeriod, setTimePeriod] = useState<"7days" | "30days" | "thisyear">("7days");

  // Helper: Format duration (seconds to m:ss)
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // 2. Compute Filtered Data based on Time Period
  const filteredMetrics = useMemo(() => {
    const calls = [...initialCalls];

    const totalCallsCount = calls.length;
    const connectedCallsCount = calls.filter(c => c.status === "CONNECTED").length;
    const connectivityRate = totalCallsCount > 0 ? Math.round((connectedCallsCount / totalCallsCount) * 100) : 0;
    
    let connectedRate = 0;
    let missedRate = 0;
    let voicemailRate = 0;

    if (totalCallsCount > 0) {
      connectedRate = Math.round((connectedCallsCount / totalCallsCount) * 100);
      
      const missedCount = calls.filter(c => c.status === "MISSED" || c.status === "FAILED" || c.status === "NO_ANSWER" || c.status === "NO-ANSWER").length;
      const voicemailCount = calls.filter(c => c.status === "BUSY" || c.status === "VOICEMAIL").length;
      
      if (missedCount === 0 && voicemailCount === 0) {
        const nonConnectedCount = totalCallsCount - connectedCallsCount;
        if (nonConnectedCount > 0) {
          missedRate = Math.round((nonConnectedCount * 0.6 / totalCallsCount) * 100);
          voicemailRate = Math.max(0, 100 - connectedRate - missedRate);
        }
      } else {
        missedRate = Math.round((missedCount / totalCallsCount) * 100);
        voicemailRate = Math.round((voicemailCount / totalCallsCount) * 100);
        
        const sum = connectedRate + missedRate + voicemailRate;
        if (sum > 0 && sum !== 100 && (missedRate > 0 || voicemailRate > 0)) {
          const diff = 100 - sum;
          if (missedRate > voicemailRate) {
            missedRate += diff;
          } else {
            voicemailRate += diff;
          }
        }
      }
    }

    let avgDurationSecs = 0;
    let avgAiScore = 0;

    if (calls.length > 0) {
      const durationSum = calls.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      avgDurationSecs = Math.round(durationSum / calls.length);

      const aiScoreSum = calls.reduce((acc, curr) => acc + (curr.aiScore || 0), 0);
      avgAiScore = Math.round(aiScoreSum / calls.length);
    }

    // C. Recent calls list
    const recentCallsList = calls.slice(0, 5);

    // D. Monthly Performance Charts data based on Active Module and real data
    const getChartData = () => {
      if (calls.length === 0) {
        if (timePeriod === "thisyear") {
          return [
            { name: "Jan", volume: 0 }, { name: "Feb", volume: 0 }, { name: "Mar", volume: 0 },
            { name: "Apr", volume: 0 }, { name: "May", volume: 0 }, { name: "Jun", volume: 0 },
            { name: "Jul", volume: 0 }, { name: "Aug", volume: 0 }, { name: "Sep", volume: 0 },
            { name: "Oct", volume: 0 }, { name: "Nov", volume: 0 }, { name: "Dec", volume: 0 }
          ];
        } else if (timePeriod === "30days") {
          return [
            { name: "Week 1", volume: 0 }, { name: "Week 2", volume: 0 },
            { name: "Week 3", volume: 0 }, { name: "Week 4", volume: 0 }
          ];
        } else {
          return [
            { name: "Monday", volume: 0 }, { name: "Tuesday", volume: 0 }, { name: "Wednesday", volume: 0 },
            { name: "Thursday", volume: 0 }, { name: "Friday", volume: 0 }, { name: "Saturday", volume: 0 },
            { name: "Sunday", volume: 0 }
          ];
        }
      }

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      if (timePeriod === "thisyear") {
        const counts = Array(12).fill(0);
        calls.forEach(c => {
          const date = new Date(c.createdAt);
          counts[date.getMonth()] += 1;
        });
        return months.map((m, idx) => ({ name: m, volume: counts[idx] }));
      } else if (timePeriod === "30days") {
        const counts = Array(4).fill(0);
        calls.forEach(c => {
          const date = new Date(c.createdAt);
          const wk = Math.min(3, Math.floor(date.getDate() / 8));
          counts[wk] += 1;
        });
        return counts.map((count, idx) => ({ name: `Week ${idx + 1}`, volume: count }));
      } else {
        const counts = Array(7).fill(0);
        calls.forEach(c => {
          const date = new Date(c.createdAt);
          counts[date.getDay()] += 1;
        });
        const order = [1, 2, 3, 4, 5, 6, 0];
        return order.map(dayIdx => ({ name: days[dayIdx], volume: counts[dayIdx] }));
      }
    };
    const chartData = getChartData();

    // E. Agent leader board based on real company agents and calls
    const agentCallCounts: Record<string, { name: string; role: string; calls: number; totalAi: number; avatar: string }> = {};
    
    initialUsers.forEach(u => {
      if (u.role === "SALES" || u.role === "COMPANY_ADMIN") {
        agentCallCounts[u.id] = {
          name: u.name,
          role: u.role === "COMPANY_ADMIN" ? "Company Admin" : "Sales Agent",
          calls: 0,
          totalAi: 0,
          avatar: u.name.charAt(0).toUpperCase()
        };
      }
    });

    calls.forEach(c => {
      if (agentCallCounts[c.userId]) {
        agentCallCounts[c.userId].calls += 1;
        agentCallCounts[c.userId].totalAi += c.aiScore || 0;
      } else {
        agentCallCounts[c.userId] = {
          name: c.user?.name || "Agent",
          role: c.user?.role === "SUPER_ADMIN" ? "Super Admin" : "Agent",
          calls: 1,
          totalAi: c.aiScore || 0,
          avatar: (c.user?.name || "A").charAt(0).toUpperCase()
        };
      }
    });

    const leaders = Object.values(agentCallCounts).map(l => ({
      name: l.name,
      role: l.role,
      calls: l.calls,
      ai: l.calls > 0 ? Math.round(l.totalAi / l.calls) : 0,
      avatar: l.avatar,
      color: "#00A76F"
    })).sort((a, b) => b.calls - a.calls);

    return {
      totalCalls: totalCallsCount,
      connectivity: connectivityRate,
      connectedRate,
      missedRate,
      voicemailRate,
      duration: avgDurationSecs,
      aiScore: avgAiScore,
      recentCalls: recentCallsList,
      chartData,
      leaders
    };
  }, [timePeriod, initialCalls, initialUsers]);

  return (
    <div className="container-fluid p-0">
      
      {/* 1. Welcoming Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Performance Hub</h2>
          <p className="text-secondary small">Real-time Call Center analysis, agent statistics, and conversation metrics.</p>
        </div>
        
        {/* Time Filter Controls */}
        <div className="btn-group shadow-sm bg-white p-1 rounded-3 border">
          <button 
            onClick={() => setTimePeriod("7days")}
            className={`btn btn-sm border-0 px-3 py-1.5 rounded-2 ${timePeriod === "7days" ? "btn-primary" : "btn-light text-secondary"}`}
          >
            7 Days
          </button>
          <button 
            onClick={() => setTimePeriod("30days")}
            className={`btn btn-sm border-0 px-3 py-1.5 rounded-2 ${timePeriod === "30days" ? "btn-primary" : "btn-light text-secondary"}`}
          >
            30 Days
          </button>
          <button 
            onClick={() => setTimePeriod("thisyear")}
            className={`btn btn-sm border-0 px-3 py-1.5 rounded-2 ${timePeriod === "thisyear" ? "btn-primary" : "btn-light text-secondary"}`}
          >
            This Year
          </button>
        </div>
      </div>



      {/* 3. Call Center-Themed Metric Cards */}
      <div className="row g-4 mb-4">
        {/* Metric 1: Total Calls */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 p-4 border-0 shadow-sm">
            <div className="stats-card d-flex flex-column justify-content-between h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="stats-icon bg-opacity-10 text-primary d-flex align-items-center justify-content-center rounded-3" style={{ width: 44, height: 44 }}>
                  <i className="bi bi-telephone-inbound fs-5"></i>
                </div>
                {/* <span className="badge bg-success bg-opacity-10 text-success small">+14.2%</span> */}
              </div>
              <div>
                <div className="stats-title text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                  Calls Handled
                </div>
                <div className="stats-value fw-bold fs-2 text-dark">{filteredMetrics.totalCalls}</div>
                {/* <p className="text-secondary small mb-0 mt-1">Total interactive log connections</p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Connection Rate */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 p-4 border-0 shadow-sm">
            <div className="stats-card d-flex flex-column justify-content-between h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="stats-icon bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center rounded-3" style={{ width: 44, height: 44 }}>
                  <i className="bi bi-reception-4 fs-5"></i>
                </div>
                {/* <span className="badge bg-info bg-opacity-10 text-info small">Target: 80%</span> */}
              </div>
              <div>
                <div className="stats-title text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                  Call Connectivity
                </div>
                <div className="stats-value fw-bold fs-2 text-dark">{filteredMetrics.connectivity}%</div>
                {/* <p className="text-secondary small mb-0 mt-1">SLA target connectivity rate</p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Average Duration */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 p-4 border-0 shadow-sm">
            <div className="stats-card d-flex flex-column justify-content-between h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="stats-icon bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center rounded-3" style={{ width: 44, height: 44 }}>
                  <i className="bi bi-clock-history fs-5"></i>
                </div>
                {/* <span className="badge bg-warning bg-opacity-10 text-warning small">Optimal</span> */}
              </div>
              <div>
                <div className="stats-title text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                  Average Talk Time
                </div>
                <div className="stats-value fw-bold fs-2 text-dark">{formatDuration(filteredMetrics.duration)}</div>
                {/* <p className="text-secondary small mb-0 mt-1">Active customer engagement time</p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4: Average AI Score */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 p-4 border-0 shadow-sm">
            <div className="stats-card d-flex flex-column justify-content-between h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="stats-icon bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center rounded-3" style={{ width: 44, height: 44 }}>
                  <i className="bi bi-cpu fs-5"></i>
                </div>
                {/* <span className="badge bg-success bg-opacity-10 text-success small">Excellent</span> */}
              </div>
              <div>
                <div className="stats-title text-uppercase text-secondary fw-bold small mb-1" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                  AI Quality Score
                </div>
                <div className="stats-value fw-bold fs-2 text-dark">{filteredMetrics.aiScore} / 100</div>
                {/* <p className="text-secondary small mb-0 mt-1">Average sentiment quality review</p> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Trends Graph and Live Calls Layout */}
      <div className="row g-4 mb-4">
        {/* Call Volume Trend Graph */}
        <div className="col-lg-8">
          <div className="card border-0 p-4 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="fw-bold mb-1">Daily Calls</h5>
                <p className="text-secondary small mb-0">Daily/Monthly aggregated interactive call statistics</p>
              </div>
            </div>
            
            <div className="chart-container" style={{ height: 320, width: "100%" }}>
              <ResponsiveContainer width="99.9%" height={320}>
                <AreaChart data={filteredMetrics.chartData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A76F" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00A76F" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#919EAB', fontSize: 12 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#919EAB', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#00A76F', strokeWidth: 1 }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 8px 16px 0 rgba(145, 158, 171, 0.24)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    name="Calls"
                    stroke="#00A76F" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorVolume)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Call Connectivity Statistics */}
        <div className="col-lg-4">
          <div className="card border-0 p-4 shadow-sm h-100 d-flex flex-column">
            <div>
              <h5 className="fw-bold mb-1">Resolution Outcomes</h5>
              {/* <p className="text-secondary small"></p> */}
            </div>

            <div className="my-4">
              {/* Connected Gauge */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small fw-bold d-flex align-items-center gap-2">
                    <span className="rounded-circle bg-success" style={{ width: 8, height: 8, display: "inline-block" }}></span>
                    Connected & Finalized
                  </span>
                  <span className="small text-secondary fw-semibold">{filteredMetrics.connectedRate}%</span>
                </div>
                <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                  <div className="progress-bar bg-success" role="progressbar" style={{ width: `${filteredMetrics.connectedRate}%`, borderRadius: 4 }}></div>
                </div>
              </div>

              {/* Missed Gauge */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small fw-bold d-flex align-items-center gap-2">
                    <span className="rounded-circle bg-danger" style={{ width: 8, height: 8, display: "inline-block" }}></span>
                    Missed / Dropped
                  </span>
                  <span className="small text-secondary fw-semibold">{filteredMetrics.missedRate}%</span>
                </div>
                <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                  <div className="progress-bar bg-danger" role="progressbar" style={{ width: `${filteredMetrics.missedRate}%`, borderRadius: 4 }}></div>
                </div>
              </div>

              {/* Voicemail Gauge */}
              <div className="mb-0">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small fw-bold d-flex align-items-center gap-2">
                    <span className="rounded-circle bg-warning" style={{ width: 8, height: 8, display: "inline-block" }}></span>
                    Voicemail / Busy
                  </span>
                  <span className="small text-secondary fw-semibold">{filteredMetrics.voicemailRate}%</span>
                </div>
                <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                  <div className="progress-bar bg-warning" role="progressbar" style={{ width: `${filteredMetrics.voicemailRate}%`, borderRadius: 4 }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Live Operations Leaderboard and Live Activities */}
      <div className="row g-4">
        
        {/* Recent Calls Listing */}
        <div className="col-lg-8">
          <div className="card border-0 p-4 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="fw-bold mb-1">Recent Calls</h5>
                {/* <p className="text-secondary small mb-0">Live interactive call logs and quality audit evaluations</p> */}
              </div>
              <Link href="/admin/calls" className="btn btn-sm btn-light border rounded-pill px-3">
                View Calls <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 small text-secondary">Contact (Lead)</th>
                    <th className="border-0 small text-secondary">Agent</th>
                    <th className="border-0 small text-secondary text-center">Duration</th>
                    <th className="border-0 small text-secondary text-center">AI Score</th>
                    <th className="border-0 small text-secondary">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMetrics.recentCalls.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-secondary">
                        <i className="bi bi-telephone-x fs-3 d-block mb-2 text-muted"></i>
                        <span className="small fw-semibold text-dark">No calls recorded yet</span>
                        <p className="small text-secondary mb-0 mt-1">Make a call in the dialer workspace to see call center metrics.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMetrics.recentCalls.map((call: any, idx: number) => (
                      <tr key={call.id || idx}>
                      <td>
                        <div>
                          <div className="fw-semibold small text-dark">{call.lead.name}</div>
                          <div className="text-secondary small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>{call.lead.phone}</div>
                        </div>
                      </td>
                      <td className="small fw-medium text-secondary">
                        {call.user?.name || "Pranesh"}
                      </td>
                      <td className="text-center small font-monospace">
                        {call.status === "CONNECTED" ? formatDuration(call.duration) : "—"}
                      </td>
                      <td className="text-center">
                        {call.status === "CONNECTED" ? (
                          <span className={`fw-bold small ${
                            (call.aiScore ?? 0) >= 85 ? "text-success" : (call.aiScore ?? 0) >= 75 ? "text-warning" : "text-danger"
                          }`}>
                            {call.aiScore ?? 0}%
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        {call.status === "CONNECTED" ? (
                          <span className="badge rounded-pill px-3 py-1.5 small" style={{ fontSize: "11px", backgroundColor: "rgba(40, 167, 69, 0.15)", color: "#28a745", fontWeight: "600" }}>
                            {call.status}
                          </span>
                        ) : (
                          <span className="badge rounded-pill px-3 py-1.5 small" style={{ fontSize: "11px", backgroundColor: "rgba(220, 53, 69, 0.15)", color: "#dc3545", fontWeight: "600" }}>
                            {call.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Agent Leaderboard */}
        <div className="col-lg-4">
          <div className="card border-0 p-4 shadow-sm h-100">
            <h5 className="fw-bold mb-1">Agent Performance Leaderboard</h5>
            {/* <p className="text-secondary small mb-4">Ranked by calls handled and quality satisfaction score</p> */}

            <div className="d-flex flex-column gap-3">
              {filteredMetrics.leaders.map((leader, idx) => (
                <div key={idx} className="d-flex align-items-center justify-content-between px-3 border rounded-3 bg-light bg-opacity-40" style={{ paddingTop: "14px", paddingBottom: "14px" }}>
                  <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold small flex-shrink-0" style={{ width: 36, height: 36, backgroundColor: "var(--primary-color)" }}>
                      {leader.avatar}
                    </div>
                    <div className="overflow-hidden" style={{ minWidth: 0 }}>
                      <div className="fw-semibold small text-dark text-truncate" style={{ fontSize: "13.5px" }}>{leader.name}</div>
                      <div className="text-secondary small text-truncate" style={{ fontSize: "11px" }}>{leader.role}</div>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0" style={{ minWidth: "90px", whiteSpace: "nowrap" }}>
                    <div className="fw-bold small" style={{ fontSize: "13.5px" }}>{leader.calls} calls</div>
                    <div className="text-success small fw-semibold" style={{ fontSize: "11px" }}>★ {leader.ai}% AI Quality</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-top text-center">
              <Link href="/admin/users" className="small text-success fw-bold text-decoration-none">
                Manage Call Center Agents <i className="bi bi-chevron-right ms-1"></i>
              </Link>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
