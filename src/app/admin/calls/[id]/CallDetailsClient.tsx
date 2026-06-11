"use client";

import React, { useState } from "react";
import Link from "next/link";
import CallProgression from "./CallProgression";
import CallRefresher from "./CallRefresher";

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
  const [activeTab, setActiveTab] = useState<"transcript" | "recording">("transcript");

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
            {/* Listen to Recording Toggle Button */}
            {call.jobId && (
              <button 
                onClick={() => setActiveTab(activeTab === "transcript" ? "recording" : "transcript")} 
                className={`btn px-3 py-1.5 small fw-bold d-flex align-items-center gap-2 ${
                  activeTab === "recording" ? "btn-primary text-white" : "btn-outline-primary"
                }`}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-headphones"></i><span>{activeTab === "recording" ? "View Transcript" : "Call Recording"}</span>
              </button>
            )}

            <div className="bg-white border rounded-3 px-3 py-1.5 d-flex align-items-center gap-1.5 shadow-sm">
              <span className="text-secondary fw-bold" style={{ fontSize: "11px" , padding : "0.3rem"}}>OVERALL AI SCORE:</span>
              <span className={`fw-bold small ${dynamicOverallScore > 70 ? 'text-success' : 'text-warning'}`}>
                {dynamicOverallScore}%
              </span>
            </div>
            <Link href={`/admin/calls/${id}/edit`} className="btn btn-light border px-3 py-1.5 small fw-bold d-flex align-items-center gap-2" style={{ borderRadius: "8px" }}>
              <i className="bi bi-pencil-square text-info"></i><span>Edit Log</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Progression & Analysis Component */}
      <CallProgression 
        callId={id} 
        currentStage={call.stage} 
        aiScore={call.aiScore || 85} 
        analysis={call.analysis || ""} 
      />

      <div className="row g-4">
        {/* Left Column: Transcript */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-card-text text-secondary"></i> Interactive Call Workspace
              </h5>

              {/* Tab Navigation */}
              <div className="d-flex border-bottom mb-4 gap-3">
                <button 
                  onClick={() => setActiveTab("transcript")}
                  className={`btn btn-link nav-link pb-2 px-3 fw-bold border-bottom border-2 text-decoration-none ${
                    activeTab === "transcript" ? "border-primary text-primary" : "border-transparent text-secondary"
                  }`}
                  style={{ fontSize: "14px", borderRadius: 0, boxShadow: "none" }}
                  type="button"
                >
                  <i className="bi bi-file-earmark-text me-1.5"></i> Transcript & Translation
                </button>
                {call.jobId && (
                  <button 
                    onClick={() => setActiveTab("recording")}
                    className={`btn btn-link nav-link pb-2 px-3 fw-bold border-bottom border-2 text-decoration-none ${
                      activeTab === "recording" ? "border-primary text-primary" : "border-transparent text-secondary"
                    }`}
                    style={{ fontSize: "14px", borderRadius: 0, boxShadow: "none" }}
                    type="button"
                  >
                    <i className="bi bi-play-circle me-1.5"></i> Call Recording
                  </button>
                )}
              </div>

              {activeTab === "transcript" ? (
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
                      <div className="d-flex flex-column gap-4">
                        <div className="d-flex gap-3 align-items-start">
                          <div className="bg-primary text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 36, height: 36, fontSize: 14 }}>A</div>
                          <div className="bg-light p-3 rounded-4 flex-grow-1 shadow-sm border">
                            <div className="d-flex justify-content-between mb-1">
                              <span className="fw-bold small text-primary">Agent: {call.user.name}</span>
                              <span className="x-small text-secondary">00:05</span>
                            </div>
                            <p className="small mb-0 text-dark">Hello, thank you for reaching out to Virpa Intelligent Sales Agent support. How can I assist you with your business needs today?</p>
                          </div>
                        </div>
                        
                        <div className="d-flex gap-3 align-items-start flex-row-reverse">
                          <div className="bg-success text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 36, height: 36, fontSize: 14 }}>L</div>
                          <div className="bg-success bg-opacity-10 p-3 rounded-4 flex-grow-1 shadow-sm border border-success border-opacity-10 text-end">
                            <div className="d-flex justify-content-between flex-row-reverse mb-1">
                              <span className="fw-bold small text-success">Lead: {call.lead.name}</span>
                              <span className="x-small text-secondary">00:12</span>
                            </div>
                            <p className="small mb-0 text-dark">{"Hi, I'm interested in scaling our customer support team and heard you provide managed services for the tech sector."}</p>
                          </div>
                        </div>

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
                    )}
                  </div>
                </>
              ) : (
                <div className="d-flex flex-column gap-3 animate-fade">
                  <div className="p-3 bg-light rounded-3 border">
                    <h6 className="fw-bold text-dark mb-3 small text-uppercase tracking-wider">Recording Details</h6>
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

        {/* Right Column: Lead Snapshot */}
        <div className="col-lg-4">
          <div className="card mb-4 border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">Lead Snapshot</h5>
              <div className="text-center mb-4 pb-3 border-bottom">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-3 text-secondary shadow-sm" style={{ width: 80, height: 80, fontSize: 32 }}>
                  {call.lead.name.charAt(0)}
                </div>
                <h5 className="fw-bold mb-1">{call.lead.name}</h5>
                <div className="text-secondary small">{call.lead.company || "Independent Entity"}</div>
              </div>

              <div className="space-y-3">
                <div className="d-flex justify-content-between py-2 border-bottom border-light">
                  <span className="small text-secondary">Phone</span>
                  <span className="small fw-bold">{call.lead.phone}</span>
                </div>
                {call.callerPhone && (
                  <div className="d-flex justify-content-between py-2 border-bottom border-light">
                    <span className="small text-secondary">Caller Phone</span>
                    <span className="small fw-bold text-primary">{call.callerPhone}</span>
                  </div>
                )}
                {call.receiverPhone && (
                  <div className="d-flex justify-content-between py-2 border-bottom border-light">
                    <span className="small text-secondary">Receiver Phone</span>
                    <span className="small fw-bold text-success">{call.receiverPhone}</span>
                  </div>
                )}
                {call.jobId && (
                  <div className="d-flex justify-content-between py-2 border-bottom border-light">
                    <span className="small text-secondary">Job ID</span>
                    <span className="small text-truncate ms-3 fw-mono text-muted" style={{ maxWidth: '150px' }}>{call.jobId}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between py-2 border-bottom border-light">
                  <span className="small text-secondary">Email</span>
                  <span className="small fw-bold text-truncate ms-3" style={{ maxWidth: '150px' }}>{call.lead.email || "N/A"}</span>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom border-light">
                  <span className="small text-secondary">Lead Source</span>
                  <span className="badge bg-light text-dark fw-normal">{call.lead.source}</span>
                </div>
                <div className="d-flex justify-content-between py-2">
                  <span className="small text-secondary">Assigned Agent</span>
                  <span className="small fw-bold">{call.user.name}</span>
                </div>
              </div>
              
              <Link href={`/admin/leads/${call.leadId}`} className="btn btn-outline-primary w-100 mt-4 py-2 small fw-bold">
                View Full Lead Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auto-refresher client hook if call details are in placeholder stage */}
      <CallRefresher isPlaceholder={isPlaceholder} />
    </div>
  );
}
