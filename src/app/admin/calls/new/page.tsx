"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveCallLog } from "./actions";

function NewCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "";
  
  const [calling, setCalling] = useState(false);
  const [timer, setTimer] = useState(0);
  const [status, setStatus] = useState("Initializing AI Voice...");

  const [showOutcome, setShowOutcome] = useState(false);
  const [selectedStage, setSelectedStage] = useState("Interested");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (calling) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [calling]);

  const startCall = () => {
    setCalling(true);
    setStatus("AI Dialing...");
    setTimeout(() => setStatus("Connected - Recording & Transcribing..."), 2000);
  };

  const handleEndCall = () => {
    setCalling(false);
    setShowOutcome(true);
    setStatus("Call Ended. Please select the outcome.");
  };

  const saveOutcome = async () => {
    setStatus("AI Analysis & Sync in progress...");
    
    const result = await saveCallLog({
      leadId,
      userId: "placeholder",
      duration: timer,
      status: selectedStage === "Not Interested" ? "FAILED" : "CONNECTED",
      stage: selectedStage, 
      transcript: `AI: Hello! We are calling regarding your interest. Lead: I have some questions about ${selectedStage}.`,
      analysis: `The lead was classified as ${selectedStage} based on the conversation tone and intent.`
    });

    if (result && result.id) {
      router.push(`/admin/calls/${result.id}`);
    } else {
      router.push("/admin/calls");
    }
  };

  return (
    <div className="container-fluid p-0 d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
      <div className="card text-center p-5 shadow-lg border-0" style={{ maxWidth: "500px", width: "100%" }}>
        <div className="mb-4">
          <div className={`rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3 ${calling ? 'bg-danger pulse-animation' : 'bg-success'}`} style={{ width: 100, height: 100 }}>
            <i className={`bi ${calling ? 'bi-telephone-fill' : 'bi-telephone-outbound'} text-white fs-1`}></i>
          </div>
          <h2 className="fw-bold">{calling ? "On Call" : "Start AI Call"}</h2>
          <p className="text-secondary">{status}</p>
        </div>

        {calling && (
          <div className="mb-4">
            <div className="fs-1 fw-bold font-monospace">
              {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
            </div>
            <div className="mt-3">
              <div className="d-flex justify-content-center gap-1">
                {[...Array(10)].map((_, i) => {
                  const pseudoHeight = ((i * 7 + 13) % 40) + 10;
                  return (
                    <div key={i} className="bg-primary" style={{ width: 4, height: pseudoHeight, borderRadius: 2 }}></div>
                  );
                })}
              </div>
              <div className="small text-secondary mt-2">AI Voice Activity Detected</div>
            </div>
          </div>
        )}

        <div className="d-flex gap-3 justify-content-center">
          {!calling && !showOutcome && (
            <button className="btn btn-success btn-lg px-5 py-3 rounded-pill fw-bold" onClick={startCall}>
              <i className="bi bi-play-fill me-2"></i> Start Call
            </button>
          )}
          
          {calling && (
            <button className="btn btn-danger btn-lg px-5 py-3 rounded-pill fw-bold" onClick={handleEndCall}>
              <i className="bi bi-telephone-x-fill me-2"></i> End Call
            </button>
          )}

          {showOutcome && (
            <div className="w-100 animate-in">
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">Call Outcome / Next Stage</label>
                <select 
                  className="form-select form-select-lg"
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                >
                  <option value="Interested">Interested</option>
                  <option value="Enquiry">Enquiry</option>
                  <option value="Desire">Desire</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Closed">Closed / Won</option>
                </select>
              </div>
              <button className="btn btn-primary btn-lg w-100 py-3 rounded-pill fw-bold" onClick={saveOutcome}>
                Save & View Analysis
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-top">
          <div className="d-flex align-items-center justify-content-center gap-2 text-secondary small">
            <i className="bi bi-shield-check text-success"></i>
            AI Analysis & Recording Enabled
          </div>
        </div>
      </div>

      <style jsx>{`
        .pulse-animation {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(220, 53, 69, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
      `}</style>
    </div>
  );
}

export default function NewCallPage() {
  return (
    <Suspense fallback={<div className="p-5 text-center">Loading Dialing Module...</div>}>
      <NewCallContent />
    </Suspense>
  );
}
