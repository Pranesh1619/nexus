"use client";

import React, { useState } from "react";
import { updateCallStage } from "../../calls/actions";
import { updateLeadStatus } from "../actions";

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

interface LeadProgressionTimelineProps {
  leadId: string;
  leadStatus: string;
  latestCall: {
    id: string;
    stage: string;
    aiScore: number;
    analysis: string;
  } | null;
  leadSource?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  calls?: { id: string; stage: string; createdAt: string | Date; duration: number | null; status: string; aiScore?: number | null; }[] | null;
}

export default function LeadProgressionTimeline({
  leadId,
  leadStatus,
  latestCall,
  leadSource = "WEBSITE",
  createdAt,
  updatedAt,
  calls = []
}: LeadProgressionTimelineProps) {
  // Determine if we are tracking Call Logs or Lead Statuses
  const hasCall = latestCall !== null;

  // 1. Initial State Setup
  const getInitialCallIndex = () => {
    if (!latestCall) return 0;
    const idx = CALL_STAGES.indexOf(latestCall.stage);
    return idx === -1 ? 0 : idx;
  };

  const getInitialLeadIndex = () => {
    const idx = LEAD_STAGES.findIndex(s => s.id === leadStatus);
    return idx === -1 ? 0 : idx;
  };

  const [selectedCallIndex, setSelectedCallIndex] = useState(getInitialCallIndex());
  const maxCallIndex = getInitialCallIndex();

  const [selectedLeadIndex, setSelectedLeadIndex] = useState(getInitialLeadIndex());
  const maxLeadIndex = getInitialLeadIndex();

  const [isUpdating, setIsUpdating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSympathy, setShowSympathy] = useState(false);

  // 2. Stage/Status Click handlers
  const handleCallStageClick = (index: number) => {
    setSelectedCallIndex(index);
  };

  const handleLeadStageClick = (index: number) => {
    setSelectedLeadIndex(index);
  };

  // 3. Update Permanent functions
  const handleUpdateCallStagePermanent = async () => {
    if (!latestCall) return;

    if (CALL_STAGES[selectedCallIndex] === "Closed") {
      setShowOutcomeModal(true);
      return;
    }

    setIsUpdating(true);
    try {
      await updateCallStage(latestCall.id, CALL_STAGES[selectedCallIndex]);
    } catch (error) {
      console.error("Failed to update call stage:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateLeadStagePermanent = async () => {
    const targetStage = LEAD_STAGES[selectedLeadIndex];
    if (targetStage.id === "WON" || targetStage.id === "LOST") {
      setShowOutcomeModal(true);
      return;
    }

    setIsUpdating(true);
    setSyncStatus("syncing");
    try {
      await updateLeadStatus(leadId, targetStage.id);
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to update lead status:", error);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  // 4. Outcomes handler
  const handleConfirmOutcome = async (finalOutcome: "WON" | "LOST") => {
    setShowOutcomeModal(false);
    if (finalOutcome === "WON") {
      setShowCelebration(true);
    } else {
      setShowSympathy(true);
    }

    setIsUpdating(true);
    setTimeout(async () => {
      // Hide celebration/sympathy and show sync modal
      setShowCelebration(false);
      setShowSympathy(false);
      setSyncStatus("syncing");
      try {
        if (hasCall && latestCall) {
          await updateCallStage(latestCall.id, "Closed", finalOutcome);
        } else {
          await updateLeadStatus(leadId, finalOutcome);
        }
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("idle"), 3000);
      } catch (error) {
        console.error("Failed to update closed status:", error);
        setSyncStatus("error");
        setTimeout(() => setSyncStatus("idle"), 3000);
      } finally {
        setIsUpdating(false);
      }
    }, 3200);
  };

  const getStageDetails = () => {
    const stage = LEAD_STAGES[selectedLeadIndex];
    if (!stage) return null;

    const isReached = selectedLeadIndex <= maxLeadIndex;

    // Default fallbacks
    let medium = "System Record";
    let time = "—";
    let notes = "This stage is currently pending in the pipeline.";

    const formattedCreatedAt = createdAt ? new Date(createdAt).toLocaleString() : "—";
    const formattedUpdatedAt = updatedAt ? new Date(updatedAt).toLocaleString() : "—";

    if (stage.id === "NEW") {
      medium = leadSource ? `Source: ${leadSource}` : "System Entry";
      time = formattedCreatedAt;
      notes = "Lead discovered and registered in the database. Initial tracking initiated.";
    } else if (stage.id === "CONTACTED") {
      if (isReached) {
        const contactCall = calls && calls.find(c => c.status === "CONNECTED" || c.stage.includes("Contact") || c.stage.includes("Connected") || c.stage.includes("Attempted"));
        medium = contactCall ? `Voice Call Log (Duration: ${contactCall.duration || 0}s)` : "Manual Status Update";
        time = contactCall ? new Date(contactCall.createdAt).toLocaleString() : formattedUpdatedAt;
        notes = "First-touch outreach completed successfully. Value proposition delivered.";
      } else {
        medium = "Awaiting Phone Outreach";
        notes = "Awaiting the representative to make the initial phone call and log outcomes.";
      }
    } else if (stage.id === "QUALIFIED") {
      if (isReached) {
        const qualCall = calls && calls.find(c => c.stage.includes("Qualified") || c.stage.includes("Interested") || c.stage.includes("Engaged"));
        medium = qualCall ? `AI-Analyzed Call (Score: ${qualCall.aiScore || 0}%)` : "Sales Agent Verification";
        time = qualCall ? new Date(qualCall.createdAt).toLocaleString() : formattedUpdatedAt;
        notes = "Lead qualifications verified. Client requirements align with our current BPO offerings.";
      } else {
        medium = "Awaiting Qualification Check";
        notes = "Reviewing business requirements, size, and budget to qualify the lead.";
      }
    } else if (stage.id === "WON") {
      if (leadStatus === "WON") {
        medium = "Contract Execution / Closing Session";
        time = formattedUpdatedAt;
        notes = "Deal officially WON! Handed over to operations for onboarding and service delivery.";
      } else {
        medium = "Closing Phase Pipeline";
        notes = "Proposal finalized. Reviewing contracts and awaiting final signature.";
      }
    } else if (stage.id === "LOST") {
      if (leadStatus === "LOST") {
        medium = "Representative Handled Closing Call";
        time = formattedUpdatedAt;
        notes = "Deal closed as LOST. Feedback logged for future pipeline optimization.";
      } else {
        medium = "Closing Phase Pipeline";
        notes = "Standard closing review. Active unless explicitly closed as lost.";
      }
    }

    return {
      title: stage.title,
      isReached,
      medium,
      time,
      notes
    };
  };

  const stageDetails = getStageDetails();

  return (
    <div className="w-100">
      {/* 1. Choice Modal */}
      {showOutcomeModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade" style={{ zIndex: 1050, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)" }}>
          <div className="card border-0 shadow-lg p-4 bg-white position-relative" style={{ maxWidth: "420px", width: "90%", borderRadius: "16px" }}>
            <button
              onClick={() => setShowOutcomeModal(false)}
              className="position-absolute border-0 bg-transparent text-secondary p-1"
              style={{ top: "16px", right: "16px", outline: "none", cursor: "pointer" }}
              title="Close"
            >
              <i className="bi bi-x-lg" style={{ fontSize: "16px" }}></i>
            </button>

            <div className="text-center">
              <div className="display-4 mb-2">🤝</div>
              <h5 className="fw-bold text-dark">Close Lead Outcome</h5>
              <p className="text-secondary small mb-4">Please select the final outcome of this sales interaction to proceed.</p>

              <div className="d-flex gap-3 justify-content-center">
                <button
                  onClick={() => handleConfirmOutcome("WON")}
                  className="btn btn-success px-4 py-2 fw-bold d-flex align-items-center gap-2"
                  style={{ borderRadius: "50px" }}
                >
                  🏆 Deal Won
                </button>
                <button
                  onClick={() => handleConfirmOutcome("LOST")}
                  className="btn btn-outline-danger px-4 py-2 fw-bold d-flex align-items-center gap-2"
                  style={{ borderRadius: "50px" }}
                >
                  ❌ Deal Lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Celebration Screen */}
      {showCelebration && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-center animate-fade" style={{ zIndex: 9999, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(10px)" }}>
          {Array.from({ length: 60 }).map((_, idx) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2.5;
            const color = ["#00A76F", "#ffc107", "#0d6efd", "#e91e63", "#9c27b0"][Math.floor(Math.random() * 5)];
            const size = Math.random() * 8 + 6;
            return (
              <div
                key={idx}
                className="confetti-particle"
                style={{
                  left: `${left}%`,
                  animationDelay: `${delay}s`,
                  backgroundColor: color,
                  width: `${size}px`,
                  height: `${size}px`
                }}
              />
            );
          })}

          <div className="card border-0 shadow-lg p-5 bg-white text-center animate-fade position-relative" style={{ maxWidth: "450px", width: "90%", borderRadius: "20px" }}>
            <button
              onClick={() => setShowCelebration(false)}
              className="position-absolute border-0 bg-transparent text-secondary p-1"
              style={{ top: "16px", right: "16px", outline: "none", cursor: "pointer" }}
              title="Close"
            >
              <i className="bi bi-x-lg" style={{ fontSize: "16px" }}></i>
            </button>

            <div className="display-3 mb-3 animate-bounce">🎉 🏆 🎉</div>
            <h2 className="fw-bold text-dark mb-2">Congratulations!</h2>
            <p className="lead fw-semibold text-success mb-3" style={{ fontSize: "1.3rem" }}>This Deal is officially WON! 🚀</p>
            <p className="text-secondary small mb-0">Updating records and syncing dashboard performance logs...</p>
          </div>
        </div>
      )}

      {/* 3. Sympathy Screen */}
      {showSympathy && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-center animate-fade" style={{ zIndex: 9999, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(10px)" }}>
          <div className="card border-0 shadow-lg p-5 bg-white text-center animate-fade position-relative" style={{ maxWidth: "450px", width: "90%", borderRadius: "20px" }}>
            <button
              onClick={() => setShowSympathy(false)}
              className="position-absolute border-0 bg-transparent text-secondary p-1"
              style={{ top: "16px", right: "16px", outline: "none", cursor: "pointer" }}
              title="Close"
            >
              <i className="bi bi-x-lg" style={{ fontSize: "16px" }}></i>
            </button>

            <div className="display-3 mb-3 animate-bounce">💪 ❤️ 🤝</div>
            <h2 className="fw-bold text-dark mb-2">Keep Pushing!</h2>
            <p className="lead fw-semibold text-danger mb-3" style={{ fontSize: "1.3rem" }}>Every 'No' brings us closer to a 'Yes'!</p>
            <p className="text-secondary small mb-0">Recording outcome and updating sales logs. We'll win the next one!</p>
          </div>
        </div>
      )}

      {/* Premium Bubble-Step Pipeline */}
      <div className="card mb-4 border-0 shadow-sm overflow-hidden bg-white">
        <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 x-small uppercase text-secondary">
              <i className="bi bi-diagram-3-fill text-primary me-2"></i>
              {hasCall ? "Call Log Stage Pipeline" : "Lead Lifecycle Stage"}
            </h6>
            <p className="text-dark small mb-0 fw-bold">
              Current Phase:{" "}
              <span className="text-primary">
                {hasCall ? CALL_STAGES[selectedCallIndex] : LEAD_STAGES[selectedLeadIndex].title}
              </span>
            </p>
          </div>
          {hasCall ? (
            selectedCallIndex !== maxCallIndex && (
              <button
                onClick={handleUpdateCallStagePermanent}
                disabled={isUpdating}
                className="btn btn-sm btn-outline-primary px-3 py-1.5 x-small fw-bold"
                style={{ borderRadius: "50px" }}
              >
                {isUpdating ? "Syncing..." : "Update Call Stage"}
              </button>
            )
          ) : (
            selectedLeadIndex !== maxLeadIndex && (
              <button
                onClick={handleUpdateLeadStagePermanent}
                disabled={isUpdating}
                className="btn btn-sm btn-outline-primary px-3 py-1.5 x-small fw-bold"
                style={{ borderRadius: "50px" }}
              >
                {isUpdating ? "Syncing..." : "Update Lead Lifecycle Status"}
              </button>
            )
          )}
        </div>

        <div className="p-4 p-md-5 overflow-auto">
          <div className="position-relative pb-4" style={{ minWidth: hasCall ? "900px" : "auto" }}>
            {/* The Horizontal Path */}
            <div className="progress position-absolute w-100" style={{ height: "2px", top: "28px", backgroundColor: "#f0f0f0" }}>
              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{
                  width: `${hasCall ? (maxCallIndex / (CALL_STAGES.length - 1)) * 100 : (maxLeadIndex / (LEAD_STAGES.length - 1)) * 100}%`,
                  transition: 'width 0.5s ease-in-out'
                }}
              ></div>
            </div>

            {/* Bubble Steps */}
            <div className="d-flex justify-content-between position-relative z-1">
              {hasCall ? (
                CALL_STAGES.map((stage, index) => {
                  const isReached = index <= maxCallIndex;
                  const isSelected = index === selectedCallIndex;

                  return (
                    <div key={stage} className="text-center" style={{ width: "60px" }}>
                      <div
                        onClick={() => handleCallStageClick(index)}
                        className={`bubble-step ${isSelected ? 'active' : ''} ${isReached ? 'reached' : ''}`}
                      >
                        <div className="bubble-box shadow-sm">
                          {index + 1}
                          <div className="bubble-pointer"></div>
                        </div>
                        <div className="bubble-dot"></div>
                        <div className={`bubble-label mt-2 x-small fw-bold transition-all ${isSelected ? 'text-primary' : isReached ? 'text-success' : 'text-secondary opacity-50'}`}>
                          {stage}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                LEAD_STAGES.map((stage, index) => {
                  const isReached = index <= maxLeadIndex;
                  const isSelected = index === selectedLeadIndex;

                  return (
                    <div key={stage.id} className="text-center" style={{ width: "100px" }}>
                      <div
                        onClick={() => handleLeadStageClick(index)}
                        className={`bubble-step ${isSelected ? 'active' : ''} ${isReached ? 'reached' : ''}`}
                      >
                        <div className="bubble-box shadow-sm" style={{ width: "42px" }}>
                          {index + 1}
                          <div className="bubble-pointer"></div>
                        </div>
                        <div className="bubble-dot"></div>
                        <div className={`bubble-label mt-2 x-small fw-bold transition-all ${isSelected ? 'text-primary' : isReached ? 'text-success' : 'text-secondary opacity-50'}`}>
                          {stage.title}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Stage Details Insights Panel */}
        {!hasCall && stageDetails && (
          <div className="border-top bg-light bg-opacity-40 p-4 animate-fade">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-info-circle text-primary fs-5"></i>
              <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "14px" }}>
                {stageDetails.title} Phase Insights
              </h6>
              <span className={`badge px-2.5 py-1 rounded-pill ${stageDetails.isReached ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'} x-small fw-bold`}>
                {stageDetails.isReached ? "Reached / Completed" : "Pipeline Queue"}
              </span>
            </div>
            <div className="row g-3">
              {/* Box 1: Medium/Reference */}
              <div className="col-md-4">
                <div className="bg-white p-4 rounded-3 shadow-sm border border-light h-100">
                  <div className="text-secondary x-small fw-bold text-uppercase mb-2" style={{ fontSize: "10px", letterSpacing: "0.3px" }}>
                    <i className="bi bi-compass text-primary me-1"></i> Medium / Reference
                  </div>
                  <div className="fw-bold text-dark small" style={{ fontSize: "13px" }}>
                    {stageDetails.medium}
                  </div>
                </div>
              </div>
              {/* Box 2: Time reached */}
              <div className="col-md-4">
                <div className="bg-white p-4 rounded-3 shadow-sm border border-light h-100">
                  <div className="text-secondary x-small fw-bold text-uppercase mb-2" style={{ fontSize: "10px", letterSpacing: "0.3px" }}>
                    <i className="bi bi-clock text-primary me-1"></i> Logged Timestamp
                  </div>
                  <div className="fw-bold text-dark small" style={{ fontSize: "13px" }}>
                    {stageDetails.time}
                  </div>
                </div>
              </div>
              {/* Box 3: Description Notes */}
              <div className="col-md-4">
                <div className="bg-white p-4 rounded-3 shadow-sm border border-light h-100">
                  <div className="text-secondary x-small fw-bold text-uppercase mb-2" style={{ fontSize: "10px", letterSpacing: "0.3px" }}>
                    <i className="bi bi-card-text text-primary me-1"></i> Phase Description
                  </div>
                  <div className="text-secondary small" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                    {stageDetails.notes}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zoho Sync Status Modal */}
      {syncStatus !== "idle" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)", zIndex: 1070 }}
        >
          <div
            className="card border-0 shadow-lg p-5 bg-white text-center"
            style={{ maxWidth: "380px", width: "90%", borderRadius: "24px" }}
          >
            {syncStatus === "syncing" && (
              <div className="d-flex flex-column align-items-center justify-content-center py-2">
                <div className="spinner-border text-primary mb-4" role="status" style={{ width: "3.5rem", height: "3.5rem", borderWidth: "4px" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="fw-bold text-dark mb-1">Syncing with Zoho CRM</h5>
                <p className="text-secondary small mb-0">Updating lead lifecycle status across your CRM...</p>
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
                <p className="text-secondary small mb-0">Lead status has been updated in Zoho CRM.</p>
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

      <style jsx>{`
        .bubble-step {
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bubble-box {
          width: 38px;
          height: 28px;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: #637381;
          margin: 0 auto 12px;
          position: relative;
          transition: all 0.3s ease;
        }
        .bubble-pointer {
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background: #fff;
          border-right: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
        }
        .bubble-dot {
          width: 12px;
          height: 12px;
          background: #fff;
          border: 2px solid #e0e0e0;
          border-radius: 50%;
          margin: 0 auto;
          position: relative;
          z-index: 2;
          transition: all 0.3s ease;
        }
        .bubble-step.reached .bubble-box {
          background: #00A76F;
          color: #fff;
          border-color: #00A76F;
        }
        .bubble-step.reached .bubble-pointer {
          background: #00A76F;
          border-color: #00A76F;
        }
        .bubble-step.reached .bubble-dot {
          background: #00A76F;
          border-color: #fff;
        }
        .bubble-step.active .bubble-box {
          background: #0d6efd;
          color: #fff;
          border-color: #0d6efd;
        }
        .bubble-step.active .bubble-pointer {
          background: #0d6efd;
          border-color: #0d6efd;
        }
        .bubble-step.active .bubble-dot {
          background: #0d6efd;
          border-color: #fff;
        }
        .bubble-label {
          font-size: 10.5px;
          text-transform: none;
          letter-spacing: 0.2px;
          max-width: 85px;
          margin: 0 auto;
          line-height: 1.25;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .confetti-particle {
          position: fixed;
          top: -20px;
          z-index: 9999;
          border-radius: 50%;
          animation: confetti-fall 3.5s linear infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce {
          animation: bounce 1.5s infinite ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
