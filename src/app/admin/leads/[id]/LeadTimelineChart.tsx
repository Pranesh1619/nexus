"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CallLog {
  id: string;
  duration: number | null;
  status: string;
  stage: string;
  aiScore: number | null;
  createdAt: Date;
}

interface LeadTimelineChartProps {
  calls: CallLog[];
}

export default function LeadTimelineChart({ calls }: LeadTimelineChartProps) {
  // Filters state
  const [metricFilter, setMetricFilter] = useState<"both" | "score" | "duration">("both");
  const [timeframe, setTimeframe] = useState<"all" | "7d" | "30d">("all");

  // Hydration state check to prevent server-side measuring warnings
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Chronological sorted calls
  const sortedCalls = useMemo(() => {
    return [...calls].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [calls]);

  // Filtered dataset based on timeframe selection
  const filteredCalls = useMemo(() => {
    const now = new Date();
    return sortedCalls.filter((call) => {
      if (timeframe === "all") return true;
      const callDate = new Date(call.createdAt);
      const diffTime = Math.abs(now.getTime() - callDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (timeframe === "7d") return diffDays <= 7;
      if (timeframe === "30d") return diffDays <= 30;
      return true;
    });
  }, [sortedCalls, timeframe]);

  // Recharts mapped data
  const chartData = useMemo(() => {
    return filteredCalls.map((call, idx) => {
      const dateObj = new Date(call.createdAt);
      return {
        id: call.id,
        name: `Call #${idx + 1}`,
        date: dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: call.duration || 0,
        aiScore: call.aiScore || 0,
        stage: call.stage,
        status: call.status,
      };
    });
  }, [filteredCalls]);

  // Calculated metrics for active timeframe
  const stats = useMemo(() => {
    if (filteredCalls.length === 0) return { avgScore: 0, avgDuration: 0 };
    const totalScore = filteredCalls.reduce((acc, d) => acc + (d.aiScore || 0), 0);
    const totalDuration = filteredCalls.reduce((acc, d) => acc + (d.duration || 0), 0);
    return {
      avgScore: Math.round(totalScore / filteredCalls.length),
      avgDuration: Math.round(totalDuration / filteredCalls.length),
    };
  }, [filteredCalls]);

  if (!isMounted) {
    return (
      <div className="card border-0 shadow-sm mb-4 bg-white" style={{ borderRadius: "16px", minHeight: "380px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
          <p className="text-secondary small fw-medium mb-0">Loading interactive analytics canvas...</p>
        </div>
      </div>
    );
  }

  if (sortedCalls.length === 0) return null;

  return (
    <div className="card border-0 shadow-sm mb-4 bg-white" style={{ borderRadius: "16px" }}>
      <div className="card-body p-4">
        
        {/* 1. Dashboard Header Panel */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h6 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <i className="bi bi-activity text-primary fs-5"></i>
              <span>Unified Interaction Analytics & Timeline</span>
            </h6>
            <p className="text-secondary x-small mb-0">Analyze call stage progressions, performance metrics, and timeline sequences.</p>
          </div>

          {/* Timeframe selector controls */}
          <div className="d-flex align-items-center gap-2 bg-light p-1 rounded-3">
            <button
              onClick={() => setTimeframe("all")}
              className={`btn btn-sm py-1 px-3 border-0 small fw-bold ${timeframe === "all" ? "bg-white text-primary shadow-sm" : "text-secondary bg-transparent"}`}
              style={{ borderRadius: "8px", fontSize: "12px" }}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeframe("30d")}
              className={`btn btn-sm py-1 px-3 border-0 small fw-bold ${timeframe === "30d" ? "bg-white text-primary shadow-sm" : "text-secondary bg-transparent"}`}
              style={{ borderRadius: "8px", fontSize: "12px" }}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeframe("7d")}
              className={`btn btn-sm py-1 px-3 border-0 small fw-bold ${timeframe === "7d" ? "bg-white text-primary shadow-sm" : "text-secondary bg-transparent"}`}
              style={{ borderRadius: "8px", fontSize: "12px" }}
            >
              7 Days
            </button>
          </div>
        </div>

        {/* 2. Unified Chronological Bubble Timeline (Now fully filterable!) */}
        <div className="mb-4 bg-light bg-opacity-30 p-3 rounded-4 border border-light">
          <h6 className="fw-bold text-secondary mb-3 x-small text-uppercase tracking-wider">
            <i className="bi bi-hourglass-split me-1 text-primary"></i> 
            Milestone Sequence Path ({filteredCalls.length} interactions)
          </h6>
          
          {filteredCalls.length === 0 ? (
            <div className="text-center py-4 text-muted small">
              No milestones found inside the selected timeframe filter.
            </div>
          ) : (
            <div className="position-relative py-3" style={{ overflowX: "auto", overflowY: "hidden", scrollbarWidth: "thin" }}>
              {/* Connector line background */}
              <div 
                className="position-absolute start-0 end-0" 
                style={{ 
                  height: "3px", 
                  backgroundColor: "#e2e8f0", 
                  top: "50%", 
                  transform: "translateY(-50%)",
                  zIndex: 1,
                  minWidth: `${Math.max(100, filteredCalls.length * 140)}px`
                }}
              ></div>
              
              <div 
                className="d-flex justify-content-between align-items-center position-relative" 
                style={{ 
                  zIndex: 2, 
                  minWidth: `${Math.max(100, filteredCalls.length * 140)}px`,
                  padding: "0 30px" 
                }}
              >
                {filteredCalls.map((call, idx) => {
                  const isConnected = call.status === "CONNECTED";
                  const dateStr = new Date(call.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                  const timeStr = new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  
                  return (
                    <div key={call.id} className="text-center d-flex flex-column align-items-center" style={{ width: "110px" }}>
                      {/* DateTime Stamp */}
                      <div className="mb-2 text-secondary x-small d-flex flex-column" style={{ fontSize: "10px", height: "26px", justifyContent: "end" }}>
                        <span className="fw-bold text-dark">{dateStr}</span>
                        <span className="text-muted">{timeStr}</span>
                      </div>

                      {/* Interactive node button */}
                      <Link 
                        href={`/admin/calls/${call.id}`}
                        className="rounded-circle d-flex align-items-center justify-content-center border-2 shadow-sm"
                        style={{ 
                          width: "38px", 
                          height: "38px", 
                          backgroundColor: isConnected ? "rgba(0, 167, 111, 0.12)" : "rgba(220, 53, 69, 0.12)", 
                          borderColor: isConnected ? "#00a76f" : "#dc3545",
                          color: isConnected ? "#00a76f" : "#dc3545",
                          transition: "all 0.15s ease",
                          cursor: "pointer"
                        }}
                        title={`View call details - ${call.stage}`}
                      >
                        <i className={`bi ${isConnected ? "bi-telephone-fill" : "bi-telephone-x-fill"}`} style={{ fontSize: "12px" }}></i>
                      </Link>

                      {/* Stage Tag */}
                      <div className="mt-2 text-dark small fw-bold text-truncate" style={{ maxWidth: "100px", fontSize: "11px" }}>
                        {call.stage}
                      </div>
                      <div className="text-muted x-small" style={{ fontSize: "9.5px" }}>
                        {call.duration}s • #{idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Dynamic KPI Filter Cards Row */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6 col-lg-3">
            <div 
              onClick={() => setMetricFilter("both")}
              className={`p-3 rounded-4 border transition-all cursor-pointer ${metricFilter === "both" ? "border-primary bg-primary bg-opacity-5" : "border-light bg-white"}`}
            >
              <div className="text-muted x-small mb-1 uppercase tracking-wider fw-bold">Active Metrics</div>
              <div className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "14px" }}>
                <span className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: "var(--primary-color)" }}></span>
                <span>Dual Graph View</span>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div 
              onClick={() => setMetricFilter("score")}
              className={`p-3 rounded-4 border transition-all cursor-pointer ${metricFilter === "score" ? "border-primary bg-primary bg-opacity-5" : "border-light bg-white"}`}
            >
              <div className="text-muted x-small mb-1 uppercase tracking-wider fw-bold">Avg AI Score</div>
              <div className="fw-bold text-primary d-flex align-items-center gap-2" style={{ fontSize: "17px" }}>
                <span>{stats.avgScore}%</span>
                <span className="x-small text-muted fw-normal" style={{ fontSize: "10px" }}>(Filter)</span>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div 
              onClick={() => setMetricFilter("duration")}
              className={`p-3 rounded-4 border transition-all cursor-pointer ${metricFilter === "duration" ? "border-primary bg-primary bg-opacity-5" : "border-light bg-white"}`}
            >
              <div className="text-muted x-small mb-1 uppercase tracking-wider fw-bold">Avg Duration</div>
              <div className="fw-bold text-info d-flex align-items-center gap-2" style={{ fontSize: "17px" }}>
                <span>{stats.avgDuration}s</span>
                <span className="x-small text-muted fw-normal" style={{ fontSize: "10px" }}>(Filter)</span>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="p-3 rounded-4 border border-light bg-light bg-opacity-30">
              <div className="text-muted x-small mb-1 uppercase tracking-wider fw-bold">Active Calls</div>
              <div className="fw-bold text-dark" style={{ fontSize: "17px" }}>
                {filteredCalls.length} Sessions
              </div>
            </div>
          </div>
        </div>

        {/* 4. The Interactive Recharts Graphic Canvas */}
        {chartData.length === 0 ? (
          <div className="text-center py-5 rounded-4 bg-light bg-opacity-50 border border-dashed">
            <i className="bi bi-calendar-x fs-3 text-muted d-block mb-2"></i>
            <span className="text-secondary small fw-medium">No active metrics found within the selected timeframe.</span>
          </div>
        ) : (
          <div style={{ width: "100%", height: 280, minHeight: 280, position: "relative" }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  {/* Glowing Emerald Green Gradient */}
                  <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Sky Blue Gradient */}
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: "500" }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: "500" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border-0 shadow-lg rounded-4 text-start" style={{ minWidth: "190px", fontSize: "12px", border: "1px solid #f1f5f9" }}>
                          <div className="fw-bold text-dark mb-1">{data.name}</div>
                          <div className="text-secondary mb-2" style={{ fontSize: "11px" }}>{data.date} • {data.time}</div>
                          <div className="d-flex flex-column gap-1.5">
                            {(metricFilter === "both" || metricFilter === "score") && (
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-secondary">AI Quality Score:</span>
                                <span className="fw-bold text-success bg-success bg-opacity-10 px-1.5 py-0.5 rounded" style={{ fontSize: "11px" }}>{data.aiScore}%</span>
                              </div>
                            )}
                            {(metricFilter === "both" || metricFilter === "duration") && (
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-secondary">Call Duration:</span>
                                <span className="fw-bold text-info bg-info bg-opacity-10 px-1.5 py-0.5 rounded" style={{ fontSize: "11px" }}>{data.duration}s</span>
                              </div>
                            )}
                            <div className="d-flex justify-content-between mt-1 pt-1.5 border-top">
                              <span className="text-secondary">Stage:</span>
                              <span className="fw-bold text-dark">{data.stage}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-secondary">Call Status:</span>
                              <span className={`fw-bold text-${data.status === "CONNECTED" ? "success" : "danger"}`}>{data.status}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* AI Score Path */}
                {(metricFilter === "both" || metricFilter === "score") && (
                  <Area
                    type="monotone"
                    dataKey="aiScore"
                    stroke="var(--primary-color)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAi)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "var(--primary-color)" }}
                  />
                )}
                
                {/* Call Duration Path */}
                {(metricFilter === "both" || metricFilter === "duration") && (
                  <Area
                    type="monotone"
                    dataKey="duration"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDuration)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#0284c7" }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
