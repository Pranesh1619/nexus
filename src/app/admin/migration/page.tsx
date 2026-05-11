"use client";

import React, { useState, useEffect } from "react";
import { exchangeZohoRefreshToken, performZohoSync, getStoredZohoConfig } from "./actions";

interface MigrationLog {
  id: string;
  timestamp: string;
  leadName?: string;
  type: "Lead" | "Call" | "Deal" | "System";
  operation: "FETCHED_FROM_ZOHO" | "UPDATED_ON_SITE" | "PUSHED_TO_ZOHO" | "HANDSHAKE";
  details: string;
  status: "SUCCESS" | "WARNING" | "SKIPPED";
  syncFlow?: "App → Zoho Bigin" | "Zoho Bigin → App" | "System";
}

export default function MigrationPage() {
  // Credentials state
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [refreshToken, setRefreshToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenFeedback, setTokenFeedback] = useState<{ type: "success" | "danger" | "warning"; text: string } | null>(null);

  // Migration status state
  const [migrationStage, setMigrationStage] = useState<"idle" | "authenticating" | "fetching" | "reconciling" | "pushing" | "complete">("idle");
  const [progress, setProgress] = useState(0);
  const [activeStepText, setActiveStepText] = useState("Ready to migrate");
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [isBackHovered, setIsBackHovered] = useState(false);
  const [isReMigrateHovered, setIsReMigrateHovered] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Simulation controls
  const [syncCount, setSyncCount] = useState({ fetched: 0, updated: 0, pushed: 0 });

  // Load persistent credentials from the database on mount (0 env or browser cache fallbacks)
  useEffect(() => {
    async function loadConfig() {
      try {
        const dbConfig = await getStoredZohoConfig();
        if (dbConfig) {
          setClientId(dbConfig.clientId || "");
          setClientSecret(dbConfig.clientSecret || "");
          setRefreshToken(dbConfig.refreshToken || "");
          setAccessToken(dbConfig.accessToken || "");
        }
      } catch (err) {
        console.error("Failed to load stored database configurations:", err);
      }
    }

    loadConfig();
  }, []);

  // Generate permanent access token
  const handleGenerateToken = async () => {
    if (!clientId.trim() || !clientSecret.trim() || !refreshToken.trim()) {
      setTokenFeedback({
        type: "danger",
        text: "Please provide Client ID, Client Secret, and the Token first."
      });
      return;
    }

    setIsGeneratingToken(true);
    setTokenFeedback(null);

    try {
      const result = await exchangeZohoRefreshToken(clientId, clientSecret, refreshToken);
      if (result.success && result.accessToken) {
        setAccessToken(result.accessToken);
        if (result.refreshToken) {
          setRefreshToken(result.refreshToken);
        }
        setTokenFeedback({
          type: "success",
          text: "Successfully connected to Zoho CRM! Permanent tokens generated and saved inside PostgreSQL Database."
        });
      }
    } catch (err: any) {
      setTokenFeedback({
        type: "danger",
        text: err.message || "Failed to generate access token."
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Start Migration sync pipeline
  const handleStartMigration = async () => {
    if (!accessToken) {
      setTokenFeedback({
        type: "danger",
        text: "Please generate an active Permanent Access Token first before initiating migration."
      });
      return;
    }

    setShowSyncModal(true);
    setMigrationStage("authenticating");
    setProgress(15);
    setActiveStepText("Initiating Zoho API Handshake & SSL validations...");
    setLogs([]);
    setCurrentPage(1);
    setSyncCount({ fetched: 0, updated: 0, pushed: 0 });

    try {
      // Execute the real live server-side database integration!
      const result = await performZohoSync(accessToken);

      if (result.success) {
        setProgress(100);
        setLogs(result.logs as any);
        setSyncCount(result.syncCount);
        setMigrationStage("complete");
        setActiveStepText("Zoho CRM database synchronized successfully!");

        // Reload credentials from database so React state is automatically synchronized with the freshly refreshed credentials!
        try {
          const updatedConfig = await getStoredZohoConfig();
          if (updatedConfig && updatedConfig.accessToken) {
            setAccessToken(updatedConfig.accessToken);
          }
        } catch (dbErr) {
          console.warn("React credentials sync reload skipped:", dbErr);
        }
      }
    } catch (err: any) {
      setMigrationStage("idle");
      setProgress(0);
      setActiveStepText("Migration Sync Failed");
      setTokenFeedback({
        type: "danger",
        text: `Migration aborted: ${err.message || "An unexpected database connection error occurred."}`
      });
    }
  };

  // Is migrating active/complete
  const isMigrating = migrationStage !== "idle";

  // Pagination calculations
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentLogs = logs.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(logs.length / recordsPerPage);

  return (
    <div className="container-fluid py-4" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Title Header Section - Spaced beautifully and generously */}
      {/* <div className="mb-5 pb-3">
        <h2 className="fw-bold text-dark d-flex align-items-center gap-3 mb-3">
          <i className="bi bi-cloud-arrow-up text-success fs-3"></i>
          <span>Bidirectional Zoho CRM Migration</span>
        </h2>
        <p className="text-secondary small mb-0" style={{ fontSize: "14px", lineHeight: "1.6", maxWidth: "800px" }}>
          Configure secure API credentials, retrieve permanent tokens, and synchronize records bidirectionally between your Local Database and Zoho CRM.
        </p>
      </div> */}

      <div className="row g-4">
        {/* STEP 1: API Configuration Credentials */}
        <div className="col-12 animate-fade">
            <div className="card border shadow-sm rounded-4 bg-white p-4">
              {/* Header */}
              <div className="d-flex align-items-center gap-3 border-bottom pb-3 mb-4">
                <div className="bg-success bg-opacity-10 p-2.5 rounded-3 text-success d-flex align-items-center justify-content-center" style={{ width: "42px", height: "42px" }}>
                  <i className="bi bi-shield-lock-fill fs-5"></i>
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0.5" style={{ fontSize: "15.5px" }}>Zoho API Authentication</h5>
                  <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>Provide developer console client credentials and handshake keys.</p>
                </div>
              </div>

              {/* Row 1: Client ID and Client Secret Side-by-Side */}
              <div className="row g-3 mb-4">
                {/* Client ID */}
                <div className="col-md-6">
                  <label className="form-label text-secondary fw-semibold small mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-person-badge text-success"></i> Client ID
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: "48px", borderRadius: "10px", fontSize: "13.5px" }}
                    placeholder="Enter Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                </div>

                {/* Client Secret */}
                <div className="col-md-6">
                  <label className="form-label text-secondary fw-semibold small mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-key text-success"></i> Client Secret
                  </label>
                  <div className="position-relative">
                    <input
                      type={showClientSecret ? "text" : "password"}
                      className="form-control pe-5"
                      style={{ height: "48px", borderRadius: "10px", fontSize: "13.5px" }}
                      placeholder="Enter Client Secret"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary text-decoration-none py-0 px-3"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      style={{ zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <i className={`bi ${showClientSecret ? "bi-eye-slash-fill" : "bi-eye-fill"}`} style={{ fontSize: "1.1rem" }}></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Refresh Token input & Generate button side-by-side inside grid */}
              <div className="row g-3 mb-4 align-items-end">
                {/* Refresh Token (col-md-8) */}
                <div className="col-md-8">
                  <label className="form-label text-secondary fw-semibold small mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-arrow-repeat text-success"></i> Refresh Token
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: "48px", borderRadius: "10px", fontSize: "13.5px" }}
                    placeholder="Enter Zoho 10-Minute Code or Refresh Token"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                  />
                </div>

                {/* Generate Permanent Token Button (col-md-4) */}
                <div className="col-md-4">
                  <button
                    className="btn btn-success fw-bold w-100 text-white d-flex align-items-center justify-content-center gap-2"
                    style={{ 
                      height: "48px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      backgroundColor: "#00A76F",
                      borderColor: "#00A76F",
                      transition: "all 0.2s"
                    }}
                    type="button"
                    onClick={handleGenerateToken}
                    disabled={isGeneratingToken}
                  >
                    {isGeneratingToken ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cpu fs-5"></i>
                        Generate Permanent Token
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Permanent Access Token Display Field */}
              {accessToken && (
                <div className="mb-4 animate-fade">
                  <label className="form-label text-secondary fw-semibold small mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-shield-check text-success"></i> Generated Permanent Token
                  </label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    style={{ height: "48px", borderRadius: "10px", fontSize: "13.5px", fontWeight: "600", color: "#198754" }}
                    readOnly
                    value={accessToken}
                  />
                </div>
              )}

              {/* Feedback Message Banner */}
              {tokenFeedback && (
                <div className={`alert alert-${tokenFeedback.type} py-3 px-3 rounded-3 small mb-4`} style={{ fontSize: "12.5px" }}>
                  <i className={`bi ${tokenFeedback.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                  {tokenFeedback.text}
                </div>
              )}

              {/* Compact Start Migration Trigger Button */}
              <div className="d-flex pt-2">
                <button
                  onClick={handleStartMigration}
                  disabled={!accessToken}
                  className="btn btn-success px-4 py-2.5 rounded-3 fw-bold shadow-sm d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: accessToken ? "#00A76F" : "#a3b8cc",
                    borderColor: accessToken ? "#00A76F" : "#a3b8cc",
                    cursor: accessToken ? "pointer" : "not-allowed",
                    fontSize: "13.5px",
                    height: "46px",
                    width: "auto",
                    transition: "all 0.2s"
                  }}
                >
                  <i className="bi bi-cloud-arrow-down-fill"></i>
                  <span>Start Bidirectional Migration</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Zoho Sync Console Terminal Modal */}
      {showSyncModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade" 
          style={{ 
            zIndex: 9999, 
            backgroundColor: "rgba(15, 23, 42, 0.8)", 
            backdropFilter: "blur(12px)" 
          }}
        >
          <div className="card border-0 shadow-lg p-4 bg-white text-dark animate-fade" style={{ maxWidth: "720px", width: "95%", borderRadius: "20px" }}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center animate-bounce" style={{ width: 40, height: 40 }}>
                  <i className="bi bi-cloud-arrow-down-fill fs-5"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "16px" }}>Zoho Bigin Bidirectional Sync Panel</h5>
                  <span className="text-secondary x-small">Two-way synchronization, data validation, and deduplication engine.</span>
                </div>
              </div>
              {migrationStage === "complete" && (
                <button 
                  onClick={() => setShowSyncModal(false)} 
                  className="btn-close"
                  style={{ outline: "none" }}
                ></button>
              )}
            </div>

            {/* Progress Bar / Step description */}
            <div className="mb-4">
              <div className="d-flex justify-content-between text-secondary mb-1.5" style={{ fontSize: "11.5px", fontWeight: "600" }}>
                <span className="text-uppercase tracking-wider">{activeStepText}</span>
                <span>{progress}%</span>
              </div>
              <div className="progress" style={{ height: "10px", borderRadius: "50px", backgroundColor: "#EAEFEE" }}>
                <div
                  className={`progress-bar bg-success ${migrationStage !== "complete" ? "progress-bar-striped progress-bar-animated" : ""}`}
                  style={{
                    width: `${progress}%`,
                    backgroundColor: "#00A76F",
                    transition: "width 0.4s ease-in-out",
                    borderRadius: "50px"
                  }}
                ></div>
              </div>
            </div>

            {/* Sync Progress Statistics Row */}
            <div className="row g-3 mb-4">
              <div className="col-4">
                <div className="bg-light p-3 rounded-3 text-center border shadow-sm">
                  <span className="x-small text-secondary text-uppercase fw-bold d-block" style={{ fontSize: "10px", letterSpacing: "0.3px" }}>Fetched (Zoho)</span>
                  <h3 className="fw-bold text-primary mb-0 mt-1">
                    {migrationStage !== "complete" && progress < 100 ? "..." : syncCount.fetched}
                  </h3>
                </div>
              </div>
              <div className="col-4">
                <div className="bg-light p-3 rounded-3 text-center border shadow-sm">
                  <span className="x-small text-secondary text-uppercase fw-bold d-block" style={{ fontSize: "10px", letterSpacing: "0.3px" }}>Updated (Local)</span>
                  <h3 className="fw-bold text-success mb-0 mt-1">
                    {migrationStage !== "complete" && progress < 100 ? "..." : syncCount.updated}
                  </h3>
                </div>
              </div>
              <div className="col-4">
                <div className="bg-light p-3 rounded-3 text-center border shadow-sm">
                  <span className="x-small text-secondary text-uppercase fw-bold d-block" style={{ fontSize: "10px", letterSpacing: "0.3px" }}>Pushed to Zoho</span>
                  <h3 className="fw-bold text-purple mb-0 mt-1">
                    {migrationStage !== "complete" && progress < 100 ? "..." : syncCount.pushed}
                  </h3>
                </div>
              </div>
            </div>

            {/* Terminal Console Logs Area */}
            <h6 className="small fw-bold text-secondary text-uppercase mb-2 d-flex align-items-center gap-2">
              <i className="bi bi-terminal-fill text-dark"></i>
              <span>Live Sync Engine Terminal</span>
              {migrationStage !== "complete" && <span className="spinner-grow spinner-grow-sm text-success" role="status" style={{ width: "10px", height: "10px" }}></span>}
            </h6>
            
            <div 
              className="p-3 font-monospace rounded-3 text-start mb-4 shadow-inner" 
              style={{ 
                height: "240px", 
                backgroundColor: "#0d1117", 
                color: "#c9d1d9", 
                overflowY: "auto",
                fontSize: "12px",
                lineHeight: "1.6",
                border: "1px solid #30363d"
              }}
            >
              {migrationStage !== "complete" && (
                <div className="text-info animate-pulse mb-2">
                  [SYSTEM] Communicating with external Zoho servers... Syncing in progress...
                </div>
              )}
              {logs.length > 0 ? (
                logs.map((log, idx) => {
                  let color = "#c9d1d9";
                  const detailsLower = log.details.toLowerCase();
                  if (detailsLower.includes("created unique local contact") || detailsLower.includes("successfully synchronized") || detailsLower.includes("imported") || log.status === "SUCCESS") color = "#4caf50";
                  else if (detailsLower.includes("skip") || detailsLower.includes("up-to-date") || log.status === "SKIPPED") color = "#ff9800";
                  else if (detailsLower.includes("pushed") || detailsLower.includes("updated lead status")) color = "#2196f3";
                  else if (log.status === "WARNING" || detailsLower.includes("rejected") || detailsLower.includes("failed")) color = "#f44336";
                  else if (log.type === "System" || detailsLower.includes("handshake") || detailsLower.includes("validating")) color = "#00bcd4";
                  
                  return (
                    <div key={log.id || idx} style={{ color }}>
                      [{log.syncFlow?.toUpperCase() || log.type.toUpperCase()}] {log.details}
                    </div>
                  );
                })
              ) : (
                migrationStage !== "complete" && <div className="text-secondary">[PENDING] Awaiting records handshake streams...</div>
              )}
            </div>

            <div className="border-top pt-3 d-flex justify-content-between align-items-center">
              <span className="x-small text-secondary d-flex align-items-center gap-1.5 fw-semibold">
                <span className={`rounded-circle ${migrationStage !== "complete" ? 'bg-warning animate-pulse' : 'bg-success'}`} style={{ width: "8px", height: "8px", display: "inline-block" }}></span>
                {migrationStage !== "complete" ? "Migration in progress..." : "Database is fully in-sync with Zoho Bigin"}
              </span>
              <button 
                onClick={() => setShowSyncModal(false)}
                disabled={migrationStage !== "complete"}
                className="btn btn-success px-4 py-2 small fw-bold text-white"
                style={{ borderRadius: "10px", backgroundColor: "#00A76F", borderColor: "#00A76F" }}
              >
                Close Terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
