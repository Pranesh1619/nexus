"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteAgent } from "./actions";

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

function getAvatarColor(name: string) {
  const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    { bg: "rgba(0, 167, 111, 0.12)", text: "#00A76F" },
    { bg: "rgba(13, 110, 253, 0.12)", text: "#0d6efd" },
    { bg: "rgba(255, 193, 7, 0.12)", text: "#ffc107" },
    { bg: "rgba(111, 66, 193, 0.12)", text: "#6f42c1" },
    { bg: "rgba(220, 53, 69, 0.12)", text: "#dc3545" },
    { bg: "rgba(23, 162, 184, 0.12)", text: "#17a2b8" },
  ];
  return colors[sum % colors.length];
}

export default function AgentsWorkspace({ initialAgents }: AgentsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedAgentId, setSelectedAgentId] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter agents based on search text, role and specific agent selection
  const filteredAgents = useMemo(() => {
    return initialAgents.filter((agent) => {
      const nameMatch = agent.name.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = agent.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = nameMatch || emailMatch;

      if (!matchesSearch) return false;

      // Role filter
      if (roleFilter !== "all" && agent.role.toUpperCase() !== roleFilter.toUpperCase()) {
        return false;
      }

      // Specific Agent Selection filter
      if (selectedAgentId !== "all" && agent.id !== selectedAgentId) {
        return false;
      }

      return true;
    });
  }, [initialAgents, searchTerm, roleFilter, selectedAgentId]);

  // Handle delete agent
  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteAgent(deleteId);
        setDeleteId(null);
        router.refresh();
      } catch (err) {
        console.error("Failed to delete agent:", err);
        alert("Failed to delete agent. Please try again.");
      }
    });
  };

  const [showImportModal, setShowImportModal] = useState(false);

  // Client-side Export CSV Function for agents
  const handleExportCSV = () => {
    if (initialAgents.length === 0) return;
    const headers = ["ID", "Name", "Email", "Role", "Status", "Leads Assigned", "Calls Logged"];
    const rows = initialAgents.map(agent => [
      agent.id,
      agent.name,
      agent.email,
      agent.role,
      agent.status,
      agent.leads.length,
      agent.calls.length
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bpo_agents_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="d-flex flex-column gap-3 animate-fade">
      {/* Search, Role, Status Filters Bar - styled like screenshot */}
      <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: "16px" }}>
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          
          {/* Left Side: Search Box + Dropdowns */}
          <div className="d-flex align-items-center gap-3 flex-grow-1 flex-wrap">
            {/* Search Box */}
            <div className="search-box m-0" style={{ width: "280px" }}>
              <i className="bi bi-search text-secondary"></i>
              <input
                type="text"
                placeholder="Search leads, companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Role dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-select form-select-sm border cursor-pointer text-dark fw-bold"
              style={{ width: "160px", borderRadius: "50px", height: "40px", paddingLeft: "15px", paddingRight: "30px", fontSize: "14px" }}
            >
              <option value="all">All Contacts</option>
              <option value="ADMIN">Admin</option>
              <option value="SALES">Sales Rep</option>
            </select>

            {/* Status dropdown */}
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="form-select form-select-sm border cursor-pointer text-dark fw-bold"
              style={{ width: "160px", borderRadius: "50px", height: "40px", paddingLeft: "15px", paddingRight: "30px", fontSize: "14px" }}
            >
              <option value="all">All Agents</option>
              {initialAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Right Side: CSV Buttons */}
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-sm d-flex align-items-center gap-1.5 px-3 fw-bold border"
              style={{ borderRadius: "50px", borderColor: "#dee2e6", color: "#454f5b", backgroundColor: "#f4f6f8", height: "40px", fontSize: "14px" }}
            >
              <i className="bi bi-file-earmark-arrow-up"></i>
              Import CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="btn btn-sm d-flex align-items-center gap-1.5 px-3 fw-bold"
              style={{ borderRadius: "50px", border: "1px solid #00A76F", color: "#00A76F", backgroundColor: "transparent", height: "40px", fontSize: "14px" }}
            >
              <i className="bi bi-file-earmark-arrow-down" style={{ color: "#00A76F" }}></i>
              Export CSV
            </button>
          </div>

        </div>
      </div>

      {/* Main Agents Table */}
      <div className="card border-0 shadow-sm bg-white" style={{ borderRadius: "16px", overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="border-0 small text-secondary" style={{ padding: "16px" }}>S.No</th>
                <th className="border-0 small text-secondary" style={{ padding: "16px" }}>Agent Profile</th>
                <th className="border-0 small text-secondary" style={{ padding: "16px" }}>Role</th>
                <th className="border-0 small text-secondary" style={{ padding: "16px" }}>Leads Assigned</th>
                <th className="border-0 small text-secondary" style={{ padding: "16px" }}>Calls Logged</th>
                <th className="border-0 small text-secondary" style={{ padding: "16px" }}>Conversion</th>
                <th className="border-0 small text-secondary text-end" style={{ padding: "16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-5 text-center text-secondary small">
                    No agents found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent, index) => {
                  const avatarColor = getAvatarColor(agent.name);
                  const totalLeads = agent.leads.length;
                  const totalCalls = agent.calls.length;

                  // Conversion Rate
                  const wonLeads = agent.leads.filter(l => l.status === "WON" || l.status === "CLOSED_WON").length;
                  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

                  return (
                    <tr
                      key={agent.id}
                      onClick={() => router.push(`/admin/agents/${agent.id}`)}
                      className="cursor-pointer"
                      style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                    >
                      <td className="small text-secondary" style={{ padding: "16px" }}>{index + 1}</td>
                      <td style={{ padding: "16px" }}>
                        <div className="d-flex align-items-center gap-3">
                          {/* <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                            style={{
                              width: "40px",
                              height: "40px",
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
                              fontSize: "15px"
                            }}
                          >
                            {agent.name.charAt(0).toUpperCase()}
                          </div> */}
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{agent.name}</div>
                            <div className="text-secondary" style={{ fontSize: "12px" }}>{agent.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span
                          className={`badge px-2.5 py-1 fw-bold`}
                          style={{
                            backgroundColor: agent.role.toUpperCase() === "ADMIN" ? "rgba(111, 66, 193, 0.1)" : "rgba(13, 110, 253, 0.1)",
                            color: agent.role.toUpperCase() === "ADMIN" ? "#6f42c1" : "#0d6efd",
                            fontSize: "11px"
                          }}
                        >
                          {agent.role}
                        </span>
                      </td>
                      <td className="text-secondary fw-semibold" style={{ padding: "16px", fontSize: "14px" }}>
                        {totalLeads}
                      </td>
                      <td className="text-secondary fw-semibold" style={{ padding: "16px", fontSize: "14px" }}>
                        {totalCalls}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: "6px", width: "50px", borderRadius: "10px" }}>
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{ width: `${conversionRate}%`, borderRadius: "10px" }}
                              aria-valuenow={conversionRate}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            ></div>
                          </div>
                          <span className="fw-bold text-dark" style={{ fontSize: "12.5px" }}>{conversionRate}%</span>
                        </div>
                      </td>
                      <td className="text-end" style={{ padding: "16px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-end align-items-center gap-2">
                          <Link
                            href={`/admin/agents/${agent.id}`}
                            className="btn btn-sm btn-light border-0 text-primary"
                            title="View Performance"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link
                            href={`/admin/users/${agent.id}/edit`}
                            className="btn btn-sm btn-light border-0 text-info"
                            title="Edit Agent"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </Link>
                          <button
                            onClick={() => setDeleteId(agent.id)}
                            className="btn btn-sm btn-light border-0 text-danger"
                            title="Delete Agent"
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

            <h4 className="fw-bold text-dark mb-2">Delete Agent?</h4>
            <p className="text-secondary small mb-4">
              Are you sure you want to delete this agent? This action is permanent and will completely delete their profile and associated call history.
            </p>

            <div className="d-flex gap-3 justify-content-center">
              <button
                type="button"
                className="btn btn-light px-4 py-2 small fw-bold text-secondary"
                style={{ borderRadius: "10px" }}
                onClick={() => setDeleteId(null)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger px-4 py-2 small fw-bold d-flex align-items-center gap-2"
                style={{ borderRadius: "10px" }}
                onClick={handleDeleteConfirm}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "12px", height: "12px" }}></span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{
            zIndex: 1050,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(5px)"
          }}
        >
          <div
            className="card border-0 shadow-lg p-4 w-100 mx-3 bg-white"
            style={{ maxWidth: "500px", borderRadius: "20px" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 text-dark">Import Agents from CSV</h5>
              <button onClick={() => setShowImportModal(false)} className="btn-close"></button>
            </div>
            <p className="text-secondary small mb-4">
              Upload a CSV file containing agent details. Required headers: <strong>Name, Email, Role, Password</strong>.
            </p>
            <div className="border border-dashed p-4 rounded-3 text-center bg-light cursor-pointer mb-4">
              <i className="bi bi-file-earmark-arrow-up fs-2 text-muted mb-2"></i>
              <p className="small text-secondary mb-0">Click to upload or drag & drop CSV file</p>
              <input type="file" className="d-none" accept=".csv" />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-light" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ backgroundColor: "#00A76F", borderColor: "#00A76F" }} onClick={() => alert("CSV parsing feature is under configuration.")}>Upload & Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
