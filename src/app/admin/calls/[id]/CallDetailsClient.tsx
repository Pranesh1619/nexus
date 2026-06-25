"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CallProgression from "./CallProgression";
import CallRefresher from "./CallRefresher";
import { getOverallSummary } from "../new/actions";
import { simulateCallAnalysis } from "../actions";

interface CallDetailsClientProps {
  call: any;
  dynamicOverallScore: number;
  parsedTurns: any[] | null;
  isPlaceholder: boolean;
  id: string;
}

interface CustomAudioPlayerProps {
  src: string;
  initialDuration?: number;
}

function CustomAudioPlayer({ src, initialDuration }: CustomAudioPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.log("Play interrupted:", err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTime = parseFloat(e.target.value);
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-100 p-3 bg-white rounded-4 border shadow-sm mt-2">
      <style>{`
        .custom-player-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          transition: background 0.1s;
        }
        .custom-player-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #0d6efd;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .custom-player-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #0d6efd;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      `}</style>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="d-flex align-items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center border-0 shadow-sm"
          style={{ width: "42px", height: "42px", transition: "transform 0.2s" }}
          type="button"
        >
          <i className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"} fs-5 text-white`}></i>
        </button>

        {/* Progress Timeline */}
        <div className="flex-grow-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="form-range custom-player-slider"
            style={{
              background: `linear-gradient(to right, #0d6efd 0%, #0d6efd ${progressPercent}%, #dee2e6 ${progressPercent}%, #dee2e6 100%)`
            }}
          />
          <div className="d-flex justify-content-between mt-1 text-muted fw-semibold font-monospace" style={{ fontSize: "11px" }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CallDetailsClient({
  call,
  dynamicOverallScore,
  parsedTurns,
  isPlaceholder,
  id
}: CallDetailsClientProps) {
  const router = useRouter();
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<"requirement" | "overall" | "transcript" | "recording">("transcript");
  const [overallSummary, setOverallSummary] = useState<string>("");
  const [loadingOverall, setLoadingOverall] = useState<boolean>(false);

  // Retranscription states
  const [retranscribing, setRetranscribing] = useState(false);
  const [retranscribingLogs, setRetranscribingLogs] = useState<string[]>([]);
  const [retranscribeDuration, setRetranscribeDuration] = useState<string | null>(null);
  const [retranscribeError, setRetranscribeError] = useState<string | null>(null);
  const [showFailedLogs, setShowFailedLogs] = useState(false);
  const [showRetranscribeModal, setShowRetranscribeModal] = useState(false);

  // Poll retranscription status on mount and if running
  useEffect(() => {
    let intervalId: any = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/calls/${id}/retranscribe`);
        if (res.ok) {
          const data = await res.json();
          setRetranscribingLogs(data.logs || []);
          
          if (data.status === "running") {
            setRetranscribing(true);
            setRetranscribeError(null);
          } else if (data.status === "done") {
            setRetranscribing(false);
            setRetranscribeDuration(data.duration);
            if (intervalId) clearInterval(intervalId);
            router.refresh();
          } else if (data.status === "error") {
            setRetranscribing(false);
            setRetranscribeError(data.error || "Retranscription failed.");
            if (intervalId) clearInterval(intervalId);
          } else {
            setRetranscribing(false);
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (e) {
        console.error("Error polling retranscription status:", e);
      }
    };

    // Check status immediately
    poll();

    // Set up polling interval every 2 seconds
    intervalId = setInterval(poll, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, router, retranscribing]);

  const startRetranscription = async () => {
    setRetranscribing(true);
    setRetranscribingLogs(["[System] Starting background transcription job..."]);
    setRetranscribeDuration(null);
    setRetranscribeError(null);
    setShowRetranscribeModal(true); // Open the log modal

    try {
      const response = await fetch(`/api/calls/${id}/retranscribe`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start background transcription.");
      }
    } catch (err: any) {
      setRetranscribing(false);
      setRetranscribeError(err.message || "Request failed.");
    }
  };

  const handleTabChange = async (tab: "requirement" | "overall" | "transcript" | "recording") => {
    setActiveTab(tab);
    if (tab === "overall" && !overallSummary && call.leadId) {
      setLoadingOverall(true);
      try {
        const summary = await getOverallSummary(call.leadId);
        setOverallSummary(summary);
      } catch (err) {
        setOverallSummary("Failed to compile overall summary.");
      } finally {
        setLoadingOverall(false);
      }
    }
  };

  // Combine all turns by speaker into one paragraph
  const combinedAgentTurns = React.useMemo(() => {
    if (!parsedTurns) return { text: "", translation: "" };
    const agentTurns = parsedTurns.filter((t: any) => t.speaker === "Agent");
    return {
      text: agentTurns.map((t: any) => t.text).join(" ").trim(),
      translation: agentTurns.map((t: any) => t.translation || t.text).join(" ").trim()
    };
  }, [parsedTurns]);

  const combinedLeadTurns = React.useMemo(() => {
    if (!parsedTurns) return { text: "", translation: "" };
    const leadTurns = parsedTurns.filter((t: any) => t.speaker === "Lead");
    return {
      text: leadTurns.map((t: any) => t.text).join(" ").trim(),
      translation: leadTurns.map((t: any) => t.translation || t.text).join(" ").trim()
    };
  }, [parsedTurns]);

  // Formatting date-time
  const formattedDateTime = new Date(call.startTime || call.createdAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/calls" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Calls</span>
        </Link>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3">
          <h3 className="fw-bold mb-0">{call.lead.name} Call Analysis</h3>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              onClick={() => {
                if (retranscribing) {
                  setShowRetranscribeModal(true);
                } else {
                  startRetranscription();
                }
              }}
              className="btn btn-light border px-3 py-1.5 small fw-bold d-flex align-items-center gap-2"
              style={{ borderRadius: "8px" }}
            >
              {retranscribing ? (
                <>
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                  <span>Retranscribing... (View Console)</span>
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise text-success"></i>
                  <span>Re-transcribe</span>
                </>
              )}
            </button>
            <Link href={`/admin/calls/${id}/edit`} className="btn btn-light border px-3 py-1.5 small fw-bold d-flex align-items-center gap-2" style={{ borderRadius: "8px" }}>
              <i className="bi bi-pencil-square text-info"></i><span>Edit Log</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Progression Timeline Component */}
      <CallProgression 
        callId={id} 
        currentStage={call.stage} 
        aiScore={call.aiScore || 85} 
        analysis={call.analysis || ""} 
        leadId={call.leadId}
      />

      {isPlaceholder && (
        <div className="alert border-0 shadow-sm p-4 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 animate-fade" style={{ borderRadius: "16px", backgroundColor: "#f0fdf4", borderLeft: "4px solid #16a34a" }}>
          <div>
            <h6 className="fw-bold text-success mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-clock-history fs-5"></i> Awaiting Speech-to-Text & AI Analysis
            </h6>
            <p className="text-secondary mb-0 small">
              This call was recently completed but is currently in a placeholder state (waiting for the Twilio recording webhook callback, which does not run automatically on localhost).
            </p>
          </div>
          <button
            onClick={async () => {
              setSimulating(true);
              try {
                await simulateCallAnalysis(id);
                router.refresh();
              } catch (e) {
                console.error(e);
              } finally {
                setSimulating(false);
              }
            }}
            disabled={simulating}
            className="btn btn-success d-flex align-items-center gap-2 border-0 fw-bold shadow-sm text-white"
            style={{ borderRadius: "8px", fontSize: "13.5px", height: "40px", backgroundColor: "#16a34a" }}
          >
            {simulating ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <i className="bi bi-cpu"></i>
                <span>Simulate AI Analysis</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="row g-4">
        {/* Full-width Column: Workspace */}
        <div className="col-12">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-card-text text-secondary"></i> Interactive Call Workspace
              </h5>

              {/* Premium modern tab navigation with gaps and pill style */}
              <div className="d-flex flex-wrap mb-4" style={{ gap: "10px" }}>

                <button
                  onClick={() => handleTabChange("overall")}
                  className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                  style={{
                    fontSize: "13px",
                    borderRadius: "8px",
                    letterSpacing: "0.2px",
                    backgroundColor: activeTab === "overall" ? "#0d6efd" : "#f1f5f9",
                    color: activeTab === "overall" ? "#ffffff" : "#475569",
                    boxShadow: activeTab === "overall" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                  }}
                  type="button"
                >
                  <i className="bi bi-intersect"></i>Overall Summary
                </button>
                <button
                  onClick={() => handleTabChange("transcript")}
                  className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                  style={{
                    fontSize: "13px",
                    borderRadius: "8px",
                    letterSpacing: "0.2px",
                    backgroundColor: activeTab === "transcript" ? "#0d6efd" : "#f1f5f9",
                    color: activeTab === "transcript" ? "#ffffff" : "#475569",
                    boxShadow: activeTab === "transcript" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                  }}
                  type="button"
                >
                  <i className="bi bi-file-earmark-text"></i>Transcript
                </button>
                {call.jobId && (
                  <button
                    onClick={() => handleTabChange("recording")}
                    className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                    style={{
                      fontSize: "13px",
                      borderRadius: "8px",
                      letterSpacing: "0.2px",
                      backgroundColor: activeTab === "recording" ? "#0d6efd" : "#f1f5f9",
                      color: activeTab === "recording" ? "#ffffff" : "#475569",
                      boxShadow: activeTab === "recording" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                    }}
                    type="button"
                  >
                    <i className="bi bi-play-circle"></i>Call Recording
                  </button>
                )}
              </div>

              {/* Tab Contents */}
              <div className="tab-content">


                {activeTab === "overall" && (
                  <div className="p-3 bg-light rounded-0 border-start border-primary border-3 mb-3 animate-fade">
                    {loadingOverall ? (
                      <div className="d-flex align-items-center gap-2 py-2 text-primary">
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <span style={{ fontSize: "13px" }}>Generating consolidated summary...</span>
                      </div>
                    ) : (
                      <div className="text-dark mb-0 markdown-content" style={{ fontSize: "13.5px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                        {overallSummary || "No overall summary generated yet."}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "transcript" && (
                  <>
                    {retranscribing && (
                      <div className="alert alert-info border-0 shadow-sm p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between animate-fade" style={{ fontSize: "13px" }}>
                        <div className="d-flex align-items-center gap-2 text-primary fw-semibold">
                          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                          <span>Gemini AI is re-transcribing this call in the background...</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowRetranscribeModal(true)}
                          className="btn btn-outline-primary btn-sm border-0 fw-bold px-3 py-1"
                          style={{ borderRadius: "6px" }}
                        >
                          View Console Logs
                        </button>
                      </div>
                    )}

                    {retranscribeError && (
                      <div className="alert alert-danger border-0 shadow-sm p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between animate-fade" style={{ fontSize: "13px" }}>
                        <div className="d-flex align-items-center gap-2 text-danger fw-semibold">
                          <i className="bi bi-x-circle-fill fs-6"></i>
                          <span>Retranscription failed: {retranscribeError}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowRetranscribeModal(true)}
                          className="btn btn-outline-danger btn-sm border-0 fw-bold px-3 py-1"
                          style={{ borderRadius: "6px" }}
                        >
                          View Console Logs
                        </button>
                      </div>
                    )}

                    {call.detectedVoiceLanguage && (
                      <div className="d-flex flex-wrap gap-3 mb-4 p-3 bg-light rounded-3 border animate-fade">
                        <div>
                          <span className="text-secondary small fw-bold me-2">Detected Language:</span>
                          <span className="badge bg-primary rounded-pill px-3 py-1.5 capitalize">{call.detectedVoiceLanguage}</span>
                        </div>
                        <div>
                          <span className="text-secondary small fw-bold me-2">Translated To:</span>
                          <span className="badge bg-success rounded-pill px-3 py-1.5 capitalize">{call.translatedLanguage || "English"}</span>
                        </div>
                        {call.wordCount !== null && call.wordCount > 0 && (
                          <div>
                            <span className="text-secondary small fw-bold me-2">Word Count:</span>
                            <span className="fw-bold small">{call.wordCount} words</span>
                          </div>
                        )}
                        {call.duration !== null && (
                          <div>
                            <span className="text-secondary small fw-bold me-2">Duration:</span>
                            <span className="fw-bold small">{call.duration}s</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="transcript-wrapper pe-2 animate-fade" style={{ maxHeight: "450px", overflowY: "auto" }}>
                      {parsedTurns && parsedTurns.length > 0 ? (
                        <div className="d-flex flex-column gap-4">
                          {/* Agent Bubble */}
                          {combinedAgentTurns.text && (
                            <div className="d-flex gap-3 align-items-start">
                              <div 
                                className="rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm fw-bold text-white bg-primary" 
                                style={{ width: 36, height: 36, fontSize: 13 }}
                              >
                                A
                              </div>
                              <div 
                                className="p-3 rounded-4 flex-grow-1 shadow-sm border bg-white border-light-subtle"
                                style={{ maxWidth: "80%" }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1.5">
                                  <span className="fw-bold small text-primary">
                                    {call.user?.name || "Agent"} (Agent)
                                  </span>
                                  <span className="x-small text-secondary font-monospace">00:00</span>
                                </div>
                                <div className="d-flex flex-column gap-1">
                                  <div className="x-small text-muted mb-0.5 text-start">
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: "9px" }}>ORIGINAL SPEECH</span>
                                  </div>
                                  <p className="small mb-0 text-dark fw-medium" style={{ wordBreak: "break-word", lineHeight: "1.5" }}>
                                    {combinedAgentTurns.text}
                                  </p>
                                </div>
                                {combinedAgentTurns.translation && combinedAgentTurns.translation !== combinedAgentTurns.text && (
                                  <div className="mt-2 pt-2 border-top border-secondary border-opacity-10 x-small text-muted text-start">
                                    <div className="mb-1">
                                      <span className="badge bg-success bg-opacity-15" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>TRANSLATED TO ENGLISH</span>
                                    </div>
                                    <div className="mt-1 font-monospace fw-semibold text-secondary" style={{ whiteSpace: "pre-wrap" }}>
                                      {combinedAgentTurns.translation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Lead Bubble */}
                          {combinedLeadTurns.text && (
                            <div className="d-flex gap-3 align-items-start flex-row-reverse">
                              <div 
                                className="rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm fw-bold text-white bg-success" 
                                style={{ width: 36, height: 36, fontSize: 13 }}
                              >
                                L
                              </div>
                              <div 
                                className="p-3 rounded-4 flex-grow-1 shadow-sm border bg-success bg-opacity-10 border-success border-opacity-20 text-end"
                                style={{ maxWidth: "80%" }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1.5 flex-row-reverse">
                                  <span className="fw-bold small text-success">
                                    {call.lead?.name || "Lead"} (Lead)
                                  </span>
                                  <span className="x-small text-secondary font-monospace">00:01</span>
                                </div>
                                <div className="d-flex flex-column gap-1">
                                  <div className="x-small text-muted mb-0.5 text-end">
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: "9px" }}>ORIGINAL SPEECH</span>
                                  </div>
                                  <p className="small mb-0 text-dark fw-medium" style={{ wordBreak: "break-word", lineHeight: "1.5" }}>
                                    {combinedLeadTurns.text}
                                  </p>
                                </div>
                                {combinedLeadTurns.translation && combinedLeadTurns.translation !== combinedLeadTurns.text && (
                                  <div className="mt-2 pt-2 border-top border-secondary border-opacity-10 x-small text-muted text-end">
                                    <div className="mb-1">
                                      <span className="badge bg-success bg-opacity-15" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>TRANSLATED TO ENGLISH</span>
                                    </div>
                                    <div className="mt-1 font-monospace fw-semibold text-secondary" style={{ whiteSpace: "pre-wrap" }}>
                                      {combinedLeadTurns.translation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : call.translatedText || call.transcript ? (
                        <div className="bg-light p-4 rounded-4 border shadow-sm mb-3 animate-fade">
                          <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                            <span className="fw-bold small text-primary">Call Audio Transcript / Translated Text</span>
                            <span className="x-small text-secondary">{new Date(call.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="small mb-0 text-dark" style={{ lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                            {call.translatedText || call.transcript}
                          </p>
                        </div>
                      ) : (
                        <p className="text-secondary small text-center py-4">No transcript text available.</p>
                      )}
                    </div>
                  </>
                )}

                {activeTab === "recording" && (
                  <div className="d-flex flex-column gap-3 animate-fade">
                    <div className="p-3 bg-light rounded-0 border-start border-primary border-3">
                      <div className="row g-3 text-secondary" style={{ fontSize: "13px" }}>
                        <div className="col-6">
                          <span className="fw-bold">Caller Phone:</span> {call.callerPhone || "+1 (555) 019-2834"}
                        </div>
                        <div className="col-6">
                          <span className="fw-bold">Receiver Phone:</span> {call.receiverPhone || call.lead.phone}
                        </div>
                        <div className="col-6">
                          <span className="fw-bold">Duration:</span> {call.duration || 0} seconds
                        </div>
                        <div className="col-6">
                          <span className="fw-bold">Date & Time:</span> {formattedDateTime}
                        </div>
                        {call.jobId && (
                          <div className="col-12">
                            <span className="fw-bold">Twilio Call SID:</span> <span className="font-monospace text-muted small">{call.jobId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex flex-column align-items-center w-100 mt-2">
                      <span className="text-secondary fw-bold small uppercase mb-2" style={{ fontSize: "10px", letterSpacing: "1px" }}>PLAY RECORDING</span>
                      <CustomAudioPlayer 
                        src={`/api/recordings/${call.jobId}`} 
                        initialDuration={call.duration || 0}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRetranscribeModal && (
        <div className="modal show d-block animate-fade" tabIndex={-1} style={{ backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "16px", overflow: "hidden" }}>
              <div className="modal-header border-0 d-flex justify-content-between align-items-center py-3 px-4" style={{ backgroundColor: "#0f172a", color: "#f8fafc" }}>
                <h6 className="modal-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="bi bi-terminal-fill text-info"></i>
                  <span>Gemini AI Transcription Console</span>
                </h6>
                <button 
                  type="button" 
                  className="btn-close btn-close-white shadow-none" 
                  onClick={() => setShowRetranscribeModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-4" style={{ backgroundColor: "#1e293b", color: "#e2e8f0" }}>
                {/* Console Log Area */}
                <div 
                  className="p-3 font-monospace rounded-3 mb-3 border border-secondary border-opacity-20"
                  style={{ 
                    backgroundColor: "#0f172a", 
                    height: "350px", 
                    overflowY: "auto", 
                    fontSize: "12.5px", 
                    lineHeight: "1.6" 
                  }}
                  ref={(el) => {
                    if (el) el.scrollTop = el.scrollHeight;
                  }}
                >
                  {retranscribingLogs.map((logLine, i) => {
                    let textClass = "text-light";
                    if (logLine.includes("[ERROR]")) textClass = "text-danger";
                    else if (logLine.includes("[WARN]")) textClass = "text-warning";
                    else if (logLine.includes("[System]")) textClass = "text-info fw-bold";
                    else if (logLine.includes("succeeded") || logLine.includes("complete")) textClass = "text-success fw-bold";
                    
                    return (
                      <div key={i} className={`${textClass} mb-1`}>
                        {logLine}
                      </div>
                    );
                  })}
                  {retranscribing && (
                    <div className="text-info d-flex align-items-center gap-2 mt-2">
                      <div className="spinner-border spinner-border-sm text-info" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span>Processing audio...</span>
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="small">
                    {retranscribing ? (
                      <span className="text-info d-flex align-items-center gap-2">
                        <div className="spinner-border spinner-border-sm text-info" style={{ width: "12px", height: "12px" }}></div>
                        Transcribing call logs using Gemini AI...
                      </span>
                    ) : retranscribeError ? (
                      <span className="text-danger fw-semibold">
                        <i className="bi bi-x-circle-fill"></i> Retranscription failed.
                      </span>
                    ) : (
                      <span className="text-success fw-semibold">
                        <i className="bi bi-check-circle-fill"></i> Successfully retranscribed in {retranscribeDuration || "0"}s!
                      </span>
                    )}
                  </div>
                  
                  <div className="d-flex gap-2">
                    {retranscribing && (
                      <button 
                        className="btn btn-primary fw-bold px-3 border-0 animate-fade" 
                        style={{ borderRadius: "8px", fontSize: "13px" }}
                        onClick={() => setShowRetranscribeModal(false)}
                      >
                        Run in Background
                      </button>
                    )}
                    <button 
                      className="btn btn-light fw-bold px-3 border-0" 
                      style={{ borderRadius: "8px", fontSize: "13px", backgroundColor: "#f8fafc", color: "#0f172a" }}
                      onClick={() => setShowRetranscribeModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresher client hook if call details are in placeholder stage */}
      <CallRefresher isPlaceholder={isPlaceholder} />
    </div>
  );
}
