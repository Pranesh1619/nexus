"use client";

import React, { useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"requirement" | "overall" | "transcript" | "recording">("requirement");
  const [overallSummary, setOverallSummary] = useState<string>("");
  const [loadingOverall, setLoadingOverall] = useState<boolean>(false);

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

  // Group consecutive turns from the same speaker (Agent/Lead)
  const groupedTurns = React.useMemo(() => {
    if (!parsedTurns) return null;
    const turns: any[] = [];
    parsedTurns.forEach((turn: any) => {
      const last = turns[turns.length - 1];
      if (last && last.speaker === turn.speaker) {
        last.text = (last.text + " " + turn.text).trim();
        if (turn.translation) {
          last.translation = ((last.translation || "") + " " + turn.translation).trim();
        }
      } else {
        turns.push({ ...turn });
      }
    });
    return turns;
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
                  onClick={() => handleTabChange("requirement")}
                  className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                  style={{
                    fontSize: "13px",
                    borderRadius: "8px",
                    letterSpacing: "0.2px",
                    backgroundColor: activeTab === "requirement" ? "#0d6efd" : "#f1f5f9",
                    color: activeTab === "requirement" ? "#ffffff" : "#475569",
                    boxShadow: activeTab === "requirement" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                  }}
                  type="button"
                >
                  <i className="bi bi-list-task"></i>Requirement
                </button>
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
                {activeTab === "requirement" && (
                  <div className="p-3 bg-light rounded-0 border-start border-primary border-3 mb-3 animate-fade">
                    <p className="text-dark mb-0" style={{ fontSize: "13.5px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                      {call.analysis || "No requirements compiled for this call."}
                    </p>
                  </div>
                )}

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
                      {groupedTurns ? (
                        <div className="d-flex flex-column gap-3">
                          {groupedTurns.map((turn, idx) => {
                            const isAgent = turn.speaker === "Agent";
                            const speakerName = isAgent ? (call.user?.name || "Agent") : (call.lead?.name || "Lead");
                            const showTranslation = !!turn.translation;
                            
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
                                      ? "bg-white border-light-subtle" 
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
                                        <span className="badge bg-success bg-opacity-15 " style={{ fontSize: "9px", letterSpacing: "0.5px" }}>TRANSLATED TO ENGLISH</span>
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
                      ) : call.translatedText || call.transcript ? (
                        <div className="bg-light p-4 rounded-4 border shadow-sm mb-3">
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

      {/* Auto-refresher client hook if call details are in placeholder stage */}
      <CallRefresher isPlaceholder={isPlaceholder} />
    </div>
  );
}
