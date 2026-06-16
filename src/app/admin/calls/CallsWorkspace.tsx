"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  saveCallLog,
  placeRealTwilioCall,
  syncSipCallLog,
  getCallLogStatus,
  endTwilioCall,
  getTwilioCallStatus,
  getOverallSummary
} from "./new/actions";
import { deleteCallLog } from "./actions";
import CallList, { CallLogListItem } from "./CallList";

interface CustomAudioPlayerProps {
  src: string;
  initialDuration?: number;
}

export function CustomAudioPlayer({ src, initialDuration }: CustomAudioPlayerProps) {
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
        <button
          onClick={togglePlay}
          className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center border-0 shadow-sm"
          style={{ width: "42px", height: "42px", transition: "transform 0.2s" }}
          type="button"
        >
          <i className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"} fs-5 text-white`}></i>
        </button>

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

interface LeadType {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  status: string;
  email: string | null;
  createdAt?: Date | string;
}

interface SipConfigPreview {
  domain: string;
  username: string;
  callerId: string;
  codec: string;
  isActive: boolean;
  mockTwilioUrl?: string;
  useRealTwilio?: boolean;
}

interface CallsWorkspaceProps {
  initialLogs: CallLogListItem[];
  leads: LeadType[];
  sipConfig: SipConfigPreview | null;
  initialLeadId?: string;
  initialTab?: string;
}

export default function CallsWorkspace({
  initialLogs,
  leads,
  sipConfig,
  initialLeadId,
  initialTab
}: CallsWorkspaceProps) {
  const router = useRouter();

  // Tab control: "workspace" or "history"
  const [activeTab, setActiveTab] = useState<"workspace" | "history">(
    (initialTab as "workspace" | "history") || "workspace"
  );

  const [activeModalLog, setActiveModalLog] = useState<any | null>(null);
  const [modalDetailTab, setModalDetailTab] = useState<"requirement" | "overall" | "transcript" | "recording">("transcript");

  // Lead Selection
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    initialLeadId || leads[0]?.id || ""
  );
  const [leadSearch, setLeadSearch] = useState("");

  const filteredLeads = useMemo(() => {
    // Deduplicate leads by phone number to avoid duplicate sidebar entries
    const uniqueMap = new Map<string, LeadType>();
    leads.forEach(l => {
      const existing = uniqueMap.get(l.phone);
      const dateA = l.createdAt ? new Date(l.createdAt) : new Date(0);
      const dateB = (existing && existing.createdAt) ? new Date(existing.createdAt) : new Date(0);
      if (!existing || dateA > dateB) {
        uniqueMap.set(l.phone, l);
      }
    });
    const uniqueLeads = Array.from(uniqueMap.values());

    if (!leadSearch) return uniqueLeads;
    const q = leadSearch.toLowerCase();
    return uniqueLeads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.company || "").toLowerCase().includes(q) ||
      l.phone.includes(q)
    );
  }, [leads, leadSearch]);

  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  // Call Logs for the selected lead
  const selectedLeadCalls = useMemo(() => {
    if (!selectedLeadId) return [];
    return initialLogs.filter(log => log.lead.id === selectedLeadId);
  }, [initialLogs, selectedLeadId]);

  // Selected Call Log details for viewing transcript inline
  const [activeCallDetailId, setActiveCallDetailId] = useState<string | null>(null);

  const activeCallDetail = useMemo(() => {
    if (!activeCallDetailId) return null;
    return initialLogs.find(log => log.id === activeCallDetailId) || null;
  }, [initialLogs, activeCallDetailId]);

  // Tab for Call Detail View: "transcript" or "recording"
  const [detailTab, setDetailTab] = useState<"transcript" | "recording">("transcript");

  // Dialer & Call States (ported from new/page.tsx)
  const [dialMode, setDialMode] = useState<"SIP" | "AI">("AI");
  const [calling, setCalling] = useState(false);
  const [timer, setTimer] = useState(0);
  const [status, setStatus] = useState("Ready to dial");
  const [sipStatus, setSipStatus] = useState("Disconnected");

  const [showOutcome, setShowOutcome] = useState(false);
  const [selectedStage, setSelectedStage] = useState("Interested");
  const [isSyncing, setIsSyncing] = useState(false);

  const [callLanguage, setCallLanguage] = useState("English");
  const [callSid, setCallSid] = useState<string | null>(null);
  const [lastCallSummary, setLastCallSummary] = useState<any | null>(null);

  // Terminal & Protocol states
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const deviceRef = useRef<any>(null);

  // Soundwave and pipeline state
  const [pipelineConnected, setPipelineConnected] = useState(false);

  const [overallSummary, setOverallSummary] = useState<string>("");
  const [loadingOverall, setLoadingOverall] = useState<boolean>(false);

  // States for Post-Call Summary Tabs
  const [postCallSummaryTab, setPostCallSummaryTab] = useState<"requirement" | "overall" | "transcript" | "recording">("transcript");
  const [postCallOverallSummary, setPostCallOverallSummary] = useState<string>("");
  const [loadingPostCallOverall, setLoadingPostCallOverall] = useState<boolean>(false);

  // Reset modal summary states when opening a different call log in modal
  useEffect(() => {
    if (activeModalLog) {
      setModalDetailTab("transcript");
      setOverallSummary("");
      setLoadingOverall(false);
    }
  }, [activeModalLog]);

  // Reset post-call summary states when last call summary changes
  useEffect(() => {
    if (lastCallSummary) {
      setPostCallSummaryTab("transcript");
      setPostCallOverallSummary("");
      setLoadingPostCallOverall(false);
    }
  }, [lastCallSummary]);

  const handleModalTabChange = async (tab: "requirement" | "overall" | "transcript" | "recording") => {
    setModalDetailTab(tab);
    if (tab === "overall" && !overallSummary && activeModalLog) {
      setLoadingOverall(true);
      try {
        const summary = await getOverallSummary(activeModalLog.leadId);
        setOverallSummary(summary);
      } catch (err) {
        setOverallSummary("Failed to compile overall summary.");
      } finally {
        setLoadingOverall(false);
      }
    }
  };

  const handlePostCallTabChange = async (tab: "requirement" | "overall" | "transcript" | "recording") => {
    setPostCallSummaryTab(tab);
    if (tab === "overall" && !postCallOverallSummary && lastCallSummary) {
      setLoadingPostCallOverall(true);
      try {
        const summary = await getOverallSummary(lastCallSummary.leadId);
        setPostCallOverallSummary(summary);
      } catch (err) {
        setPostCallOverallSummary("Failed to compile overall summary.");
      } finally {
        setLoadingPostCallOverall(false);
      }
    }
  };

  // Sync selectedLeadId and activeTab when URL query parameters change
  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
      setShowOutcome(false);
    }
  }, [initialLeadId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as "workspace" | "history");
    }
  }, [initialTab]);

  // Reset details tab when switching active call log sessions
  useEffect(() => {
    setDetailTab("transcript");
  }, [activeCallDetailId]);

  // Auto scroll to bottom of terminal
  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const sipConfigStr = sipConfig ? JSON.stringify(sipConfig) : "";

  // Initialize WebRTC device in background
  useEffect(() => {
    if (!sipConfig) return;

    // Default to SIP if trunk config is active
    if (sipConfig.isActive) {
      setDialMode("SIP");
    }

    if (!sipConfig.useRealTwilio || typeof window === "undefined") return;

    let dev: any = null;

    async function initDevice() {
      try {
        logToTerminal(`[SYSTEM] Fetching Twilio WebRTC Access Token...`);
        const res = await fetch("/api/twilio/token");
        const data = await res.json();

        if (data.error) {
          logToTerminal(`[ERROR] Twilio Token Endpoint error: ${data.error}`);
          return;
        }

        logToTerminal(`[SYSTEM] Initializing Twilio WebRTC Device for user identity: ${data.identity}`);
        const { Device } = await import("@twilio/voice-sdk");

        dev = new Device(data.token, {
          codecPreferences: ["opus", "pcmu"] as any,
        });

        dev.on("registered", () => {
          logToTerminal(`[SYSTEM] Twilio WebRTC Voice Device successfully registered and ready.`);
          setSipStatus("Registered");
        });

        dev.on("error", (err: any) => {
          logToTerminal(`[ERROR] Twilio Device Error: ${err.message}`);
        });

        await dev.register();
        deviceRef.current = dev;
      } catch (e: any) {
        logToTerminal(`[ERROR] Failed to load Twilio WebRTC Device: ${e.message}`);
      }
    }

    initDevice();

    return () => {
      if (deviceRef.current) {
        console.log("Destroying Twilio Voice Device...");
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
    };
  }, [sipConfigStr]);

  // Setup SIP visual registration logs
  useEffect(() => {
    if (!sipConfig) return;
    if (sipConfig.useRealTwilio && sipConfig.isActive) {
      logToTerminal(`[SYSTEM] Active SIP Trunk detected: ${sipConfig.domain}`);
      logToTerminal(`[SYSTEM] Running in REAL Twilio Mode`);
      logToTerminal(`[SYSTEM] Initializing SIP Stack in browser...`);

      const t1 = setTimeout(() => {
        logToTerminal(`[TX] REGISTER sip:${sipConfig.domain} SIP/2.0`);
        logToTerminal(`     Via: SIP/2.0/WSS client.virpa.ai;branch=z9hG4bK-reg781`);
        logToTerminal(`     From: <sip:${sipConfig.username}@${sipConfig.domain}>;tag=reg01`);
        logToTerminal(`     To: <sip:${sipConfig.username}@${sipConfig.domain}>`);
        logToTerminal(`     Call-ID: reg-${Math.random().toString(36).substring(7)}`);
      }, 600);

      const t2 = setTimeout(() => {
        logToTerminal(`[RX] SIP/2.0 401 Unauthorized`);
        logToTerminal(`     WWW-Authenticate: Digest realm="${sipConfig.domain}", nonce="df8924b17"`);
      }, 1100);

      const t3 = setTimeout(() => {
        logToTerminal(`[TX] REGISTER (With Auth Digest)`);
        logToTerminal(`     Authorization: Digest username="${sipConfig.username}", realm="${sipConfig.domain}", nonce="df8924b17", response="c7849e8a"`);
      }, 1600);

      const t4 = setTimeout(() => {
        logToTerminal(`[RX] SIP/2.0 200 OK (Registered)`);
        logToTerminal(`     Contact: <sip:${sipConfig.username}@client.virpa.ai;transport=ws>;expires=3600`);
        logToTerminal(`[SIP] SIP Trunk Successfully Registered and Idle.`);
        setSipStatus("Registered");
      }, 2200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else if (!sipConfig.useRealTwilio) {
      logToTerminal(`[SYSTEM] Running in MOCK Twilio Mode (Self-hosted)`);
      logToTerminal(`[SYSTEM] Self-hosted Twilio replica: ${sipConfig.mockTwilioUrl || "http://localhost:5050"}`);
      setSipStatus("Registered");
    }
  }, [sipConfigStr]);

  // Handle call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (calling) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [calling]);

  // Poll Twilio call status
  useEffect(() => {
    if (!calling || dialMode !== "SIP" || !callSid) return;

    const interval = setInterval(async () => {
      try {
        const liveStatus = await getTwilioCallStatus(callSid);
        if (liveStatus) {
          logToTerminal(`[SYSTEM] Live Twilio Call Status: ${liveStatus}`);
        }
        if (liveStatus && ["completed", "failed", "busy", "no-answer", "canceled"].includes(liveStatus)) {
          logToTerminal(`[SYSTEM] Call disconnected by remote party (Twilio Status: ${liveStatus})`);
          handleEndCall();
        }
      } catch (error) {
        console.error("Error checking live Twilio call status:", error);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [calling, dialMode, callSid]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const logToTerminal = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const clearTerminal = () => {
    setTerminalLogs([]);
  };

  const startCall = () => {
    if (!selectedLead) return;

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setCalling(true);
    setTimer(0);
    setPipelineConnected(false);
    setCallSid(null);

    const destPhone = selectedLead.phone;
    const sipUser = sipConfig ? sipConfig.username : "guest";
    const sipDom = sipConfig ? sipConfig.domain : "simulated.voice";
    const codec = sipConfig ? sipConfig.codec : "OPUS";

    if (dialMode === "SIP" && sipConfig) {
      setStatus("Establishing SIP Session...");
      setSipStatus("Dialing");

      logToTerminal(`[CALL] Initiating outbound call to ${selectedLead.name} via Twilio Trunk...`);

      if (sipConfig.useRealTwilio) {
        if (!deviceRef.current) {
          logToTerminal(`[ERROR] Twilio WebRTC Device not ready yet.`);
          setStatus("Failed to connect");
          setSipStatus("Registered");
          setCalling(false);
          return;
        }

        logToTerminal(`[CALL] Requesting microphone access and connecting WebRTC session...`);

        let formattedPhone = destPhone.replace(/[^\d+]/g, "");
        if (!formattedPhone.startsWith("+")) {
          if (formattedPhone.startsWith("91") && formattedPhone.length === 12) {
            formattedPhone = "+" + formattedPhone;
          } else {
            formattedPhone = "+91" + formattedPhone;
          }
        }

        deviceRef.current.connect({
          params: {
            destPhone: formattedPhone,
            leadId: selectedLeadId,
            lang: callLanguage,
            userId: "placeholder"
          }
        }).then((twilioCall: any) => {
          twilioCall.on("accept", () => {
            setStatus("Connected - Audio Active");
            setSipStatus("Connected");
            setPipelineConnected(true);
            logToTerminal(`[MEDIA] WebRTC Call accepted by Twilio.`);
            logToTerminal(`[MEDIA] Audio stream established successfully.`);

            const sid = twilioCall.parameters?.CallSid || twilioCall.sid;
            if (sid) {
              setCallSid(sid);
              logToTerminal(`[SYSTEM] Twilio Call SID: ${sid}`);

              // Register initial call log entry
              syncSipCallLog({
                leadId: selectedLeadId,
                callSid: sid,
                duration: 0,
                stage: selectedStage,
                userId: "placeholder"
              });
            }
          });

          twilioCall.on("audio", (audioElement: any) => {
            logToTerminal(`[MEDIA] Remote audio stream received.`);
            if (audioElement && typeof window !== "undefined") {
              document.body.appendChild(audioElement);
              logToTerminal(`[MEDIA] Remote audio element successfully attached to DOM.`);
            }
          });

          twilioCall.on("disconnect", () => {
            logToTerminal(`[SYSTEM] WebRTC call disconnected by remote party.`);
            handleEndCall();
          });

          twilioCall.on("reject", () => {
            logToTerminal(`[SYSTEM] WebRTC call rejected.`);
            handleEndCall();
          });
        }).catch((err: any) => {
          logToTerminal(`[ERROR] Failed to start WebRTC session: ${err.message}`);
          setStatus("Failed to connect");
          setSipStatus("Registered");
          setCalling(false);
        });

        // Decorative SIP Protocol logs
        const t1 = setTimeout(() => {
          logToTerminal(`[TX] INVITE sip:${formattedPhone}@${sipDom} SIP/2.0`);
          logToTerminal(`     Via: SIP/2.0/WSS client.virpa.ai;branch=z9hG4bK-inv${Math.floor(Math.random() * 100000)}`);
          logToTerminal(`     From: "${sipUser}" <sip:${sipUser}@${sipDom}>;tag=vcall-${Math.floor(Math.random() * 100)}`);
          logToTerminal(`     To: <sip:${formattedPhone}@${sipDom}>`);
          logToTerminal(`     Content-Type: application/sdp`);
        }, 500);

        const t2 = setTimeout(() => {
          logToTerminal(`[RX] SIP/2.0 100 Trying (Locating routes...)`);
        }, 1200);

        const t3 = setTimeout(() => {
          logToTerminal(`[RX] SIP/2.0 180 Ringing (Alerting destination...)`);
        }, 2000);

        timeoutsRef.current = [t1, t2, t3];
      } else {
        // Mock Twilio Outbound
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        placeRealTwilioCall(selectedLeadId, origin, callLanguage).then((res) => {
          if (res.error) {
            logToTerminal(`[ERROR] Twilio Trunk rejected request: ${res.error}`);
            setStatus("Failed to connect");
            setSipStatus("Registered");
            setCalling(false);
          } else {
            setCallSid(res.callSid || null);
            logToTerminal(`[SYSTEM] Twilio session established. Call SID: ${res.callSid}`);
            logToTerminal(`[SYSTEM] Dispatching SIP INVITE request packet...`);
          }
        });

        const t1 = setTimeout(() => {
          logToTerminal(`[TX] INVITE sip:${destPhone}@${sipDom} SIP/2.0`);
          logToTerminal(`     Via: SIP/2.0/WSS client.virpa.ai;branch=z9hG4bK-inv${Math.floor(Math.random() * 100000)}`);
          logToTerminal(`     From: "${sipUser}" <sip:${sipUser}@${sipDom}>;tag=vcall-${Math.floor(Math.random() * 1000)}`);
          logToTerminal(`     To: <sip:${destPhone}@${sipDom}>`);
          logToTerminal(`     Call-ID: call-${Math.random().toString(36).substring(7)}@client.virpa.ai`);
          logToTerminal(`     Content-Type: application/sdp`);
          logToTerminal(`     SDP: m=audio 4000 RTP/SAVPF 111`);
          logToTerminal(`     SDP: a=rtpmap:111 ${codec.replace("_", "/")}/48000/2`);
        }, 500);

        const t2 = setTimeout(() => {
          setStatus("SIP: 100 Trying...");
          logToTerminal(`[RX] SIP/2.0 100 Trying`);
        }, 1200);

        const t3 = setTimeout(() => {
          setStatus("SIP: 180 Ringing...");
          logToTerminal(`[RX] SIP/2.0 180 Ringing`);
        }, 2000);

        const t4 = setTimeout(() => {
          setStatus("SIP: 200 OK (Answered)");
          setSipStatus("Connected");
          setPipelineConnected(true);
          logToTerminal(`[RX] SIP/2.0 200 OK`);
        }, 3500);

        const t5 = setTimeout(() => {
          logToTerminal(`[TX] ACK sip:${destPhone}@${sipDom} SIP/2.0`);
          logToTerminal(`[MEDIA] Audio media flow established.`);
          logToTerminal(`[MEDIA] Codec Negotiated: ${codec}`);
          setStatus("Connected - Audio Active");
        }, 3800);

        timeoutsRef.current = [t1, t2, t3, t4, t5];
      }
    } else {
      // AI dialer simulator
      setStatus("AI Dialing...");
      logToTerminal(`[AI] Initializing automated outbound dialer...`);
      logToTerminal(`[AI] Dialing lead phone: ${destPhone}`);

      const t1 = setTimeout(() => {
        setStatus("Connected - Call Simulation Active");
        setPipelineConnected(true);
        logToTerminal(`[AI] Call Connected successfully.`);
        logToTerminal(`[AI] Virtual Speech Pipeline Streaming Active.`);
      }, 2000);

      timeoutsRef.current = [t1];
    }
  };

  const handleEndCall = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setCalling(false);
    setShowOutcome(true);
    setPipelineConnected(false);

    const destPhone = selectedLead ? selectedLead.phone : "Destination";
    const sipUser = sipConfig ? sipConfig.username : "guest";
    const sipDom = sipConfig ? sipConfig.domain : "simulated.voice";

    if (dialMode === "SIP" && sipConfig) {
      setStatus("SIP: Sending BYE...");
      setSipStatus("Registered");
      logToTerminal(`[TX] BYE sip:${destPhone}@${sipDom} SIP/2.0`);

      if (sipConfig.useRealTwilio && deviceRef.current) {
        deviceRef.current.disconnectAll();
      }

      if (callSid) {
        logToTerminal(`[SYSTEM] Hanging up active Twilio session: ${callSid}...`);
        endTwilioCall(callSid);
      }

      setTimeout(() => {
        logToTerminal(`[RX] SIP/2.0 200 OK (BYE Processed)`);
        logToTerminal(`[MEDIA] WebRTC connection terminated.`);
        logToTerminal(`[SIP] Trunk Idle.`);
        setStatus("Call ended. Ready.");
      }, 500);
    } else {
      setStatus("Call Ended.");
      logToTerminal(`[AI] Closing audio stream and finalizing recording...`);
    }
  };

  const saveOutcome = async () => {
    setIsSyncing(true);
    setStatus("AI Analysis & Sync in progress...");

    let result;
    if (dialMode === "SIP" && callSid) {
      result = await syncSipCallLog({
        leadId: selectedLeadId,
        callSid,
        duration: timer,
        stage: selectedStage,
        userId: "placeholder"
      });
    } else {
      // Mock generated conversation analysis
      const dummyTranscript = JSON.stringify([
        { speaker: "Agent", text: "Hello, calling regarding your inquiry on our BPO services.", translation: "Hello, calling regarding your inquiry on our BPO services.", time: "00:02" },
        { speaker: "Lead", text: "Yes, I am interested in outbound sales support.", translation: "Yes, I am interested in outbound sales support.", time: "00:07" }
      ]);
      result = await saveCallLog({
        leadId: selectedLeadId,
        userId: "placeholder",
        duration: timer || 15,
        status: selectedStage === "Not Interested" ? "FAILED" : "CONNECTED",
        stage: selectedStage,
        transcript: dummyTranscript,
        translatedText: "Agent: Hello, calling regarding your inquiry on our BPO services.\nLead: Yes, I am interested in outbound sales support.",
        detectedVoiceLanguage: "English",
        translatedLanguage: "English",
        wordCount: 18,
        analysis: "Simulated AI Lead qualified. Client expressed interest in outbound sales outsourcing.",
        aiScore: 85,
        ...(callSid ? { jobId: callSid } : {})
      });
    }

    if (result && result.id && dialMode === "SIP" && callSid) {
      let isReal = false;
      let attempts = 0;
      const maxAttempts = 15;

      while (!isReal && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        attempts++;

        try {
          const freshLog = await getCallLogStatus(result.id);
          if (freshLog && freshLog.transcript && !freshLog.transcript.includes("Recording is being processed by Twilio")) {
            isReal = true;
            result = freshLog;
          }
        } catch (error) {
          console.error("Polling status error:", error);
        }
      }
    }

    setIsSyncing(false);
    setShowOutcome(false);
    setTimer(0);
    setStatus("Ready to dial");
    setLastCallSummary(result);

    // Refresh page/route state to fetch the new call logs in client view
    router.refresh();
  };

  return (
    <div className="d-flex flex-column gap-4 animate-fade">

      {/* Call Center Workspace Row: Title on Left, Tab Switcher on Right End */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-2">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Call Center Workspace</h2>
          <p className="text-secondary small mb-0">Dial customers via SIP trunks and manage interactive transcripts in a single screen.</p>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`btn px-4 py-2 fw-bold small shadow-sm ${activeTab === "workspace" ? "btn-primary text-white" : "btn-light border bg-white"}`}
            style={{ fontSize: "13.5px", borderRadius: "10px" }}
          >
            <i className="bi bi-telephone-outbound-fill me-2"></i>
            Dialing Workspace
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`btn px-4 py-2 fw-bold small shadow-sm ${activeTab === "history" ? "btn-primary text-white" : "btn-light border bg-white"}`}
            style={{ fontSize: "13.5px", borderRadius: "10px" }}
          >
            <i className="bi bi-card-text me-2"></i>
            Call History
          </button>
        </div>
      </div>
      {activeTab === "history" ? (
        <CallList logs={initialLogs} />
      ) : (
        /* Workspace Dual Panel View */
        <div className="card border shadow-sm mb-4 rounded-4 overflow-hidden bg-white" style={{ borderColor: "#cbd5e1" }}>
          <div className="row g-0" style={{ minHeight: "600px" }}>

            {/* Left Panel: Lead Selection Sidebar */}
            <div className="col-md-3 border-end border-light-subtle d-flex flex-column" style={{ height: "calc(100vh - 250px)", minHeight: "600px", overflowY: "auto" }}>
              <div className="p-3 border-bottom border-light-subtle">
                <div className="position-relative">
                  <i className="bi bi-search position-absolute text-secondary" style={{ left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}></i>
                  <input
                    type="text"
                    placeholder="Search name, phone..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="form-control w-100 search-input-field"
                    style={{ paddingLeft: "36px", fontSize: "13.5px" }}
                  />
                </div>
              </div>

              <div className="flex-grow-1 overflow-auto">
                {filteredLeads.length === 0 ? (
                  <div className="p-5 text-center text-secondary small">
                    <i className="bi bi-person-dash fs-2 d-block mb-2 text-muted"></i>
                    No leads found
                  </div>
                ) : (
                  filteredLeads.map((l) => {
                    const isSelected = selectedLeadId === l.id;
                    return (
                      <button
                        key={l.id}
                        onClick={() => {
                          if (!calling) {
                            setSelectedLeadId(l.id);
                            setActiveCallDetailId(null);
                            setLastCallSummary(null); // Clear last call summary when switching leads
                            setShowOutcome(false); // Reset outcome state for new dial target
                          }
                        }}
                        disabled={calling}
                        className={`lead-list-btn w-100 text-start border-0 px-3 py-3 d-flex flex-column gap-1 ${isSelected
                          ? "bg-success bg-opacity-10"
                          : "bg-transparent hover-bg-light"
                          }`}
                        style={{
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          borderLeft: isSelected ? "4px solid #198754" : "4px solid transparent",
                          transition: "all 0.15s"
                        }}
                      >
                        <div className="d-flex w-100 justify-content-between align-items-center">
                          <span
                            className="text-dark fw-bold"
                            style={{ fontSize: "14px" }}
                          >
                            {l.name}
                          </span>
                          {(() => {
                            const isGreenStatus = ["QUALIFIED", "CLOSED_WON", "INTERESTED", "CONNECTED"].includes(l.status.toUpperCase());
                            return (
                              <span
                                className="badge text-uppercase"
                                style={{
                                  fontSize: "9.5px",
                                  backgroundColor: isGreenStatus ? "rgba(25,135,84,0.15)" : "rgba(108,117,125,0.12)",
                                  color: isGreenStatus ? "#198754" : "#6c757d",
                                  fontWeight: "bold",
                                  padding: "4px 8px",
                                  borderRadius: "6px"
                                }}
                              >
                                {l.status}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: "11.5px" }}>
                          <span className="font-monospace text-truncate">({l.phone})</span>
                          <span className="text-truncate text-muted">{l.company || "No Company"}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Dialing & Call History console */}
            <div className="col-md-9 d-flex flex-column" style={{ height: "calc(100vh - 250px)", minHeight: "600px", overflowY: "auto" }}>
              {selectedLead ? (
                <div className="p-4 d-flex flex-column gap-4">

                  {lastCallSummary ? (
                    /* Post Call Transcript & AI Summary Panel */
                    <div className="card border-0 shadow-sm p-4 bg-white animate-fade" style={{ borderRadius: "16px" }}>
                      <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
                        <h4 className="fw-bold mb-0 text-dark">Call Summary Report</h4>
                        <button
                          onClick={() => setLastCallSummary(null)}
                          className="btn btn-outline-primary btn-sm px-3 py-1.5 fw-bold"
                          style={{ borderRadius: "8px" }}
                        >
                          <i className="bi bi-telephone-plus me-1.5"></i>
                          New Call Session
                        </button>
                      </div>

                      {/* Premium modern tab navigation with gaps and pill style */}
                      <div className="d-flex flex-wrap mb-4" style={{ gap: "10px" }}>
                        <button
                          onClick={() => handlePostCallTabChange("requirement")}
                          className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                          style={{
                            fontSize: "12px",
                            borderRadius: "8px",
                            letterSpacing: "0.2px",
                            backgroundColor: postCallSummaryTab === "requirement" ? "#0d6efd" : "#f1f5f9",
                            color: postCallSummaryTab === "requirement" ? "#ffffff" : "#475569",
                            boxShadow: postCallSummaryTab === "requirement" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                          }}
                          type="button"
                        >
                          <i className="bi bi-list-task"></i>Requirement
                        </button>
                        <button
                          onClick={() => handlePostCallTabChange("overall")}
                          className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                          style={{
                            fontSize: "12px",
                            borderRadius: "8px",
                            letterSpacing: "0.2px",
                            backgroundColor: postCallSummaryTab === "overall" ? "#0d6efd" : "#f1f5f9",
                            color: postCallSummaryTab === "overall" ? "#ffffff" : "#475569",
                            boxShadow: postCallSummaryTab === "overall" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                          }}
                          type="button"
                        >
                          <i className="bi bi-intersect"></i>Overall Summary
                        </button>
                        <button
                          onClick={() => handlePostCallTabChange("transcript")}
                          className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                          style={{
                            fontSize: "12px",
                            borderRadius: "8px",
                            letterSpacing: "0.2px",
                            backgroundColor: postCallSummaryTab === "transcript" ? "#0d6efd" : "#f1f5f9",
                            color: postCallSummaryTab === "transcript" ? "#ffffff" : "#475569",
                            boxShadow: postCallSummaryTab === "transcript" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                          }}
                          type="button"
                        >
                          <i className="bi bi-file-earmark-text"></i>Transcript
                        </button>
                        <button
                          onClick={() => handlePostCallTabChange("recording")}
                          className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                          style={{
                            fontSize: "12px",
                            borderRadius: "8px",
                            letterSpacing: "0.2px",
                            backgroundColor: postCallSummaryTab === "recording" ? "#0d6efd" : "#f1f5f9",
                            color: postCallSummaryTab === "recording" ? "#ffffff" : "#475569",
                            boxShadow: postCallSummaryTab === "recording" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                          }}
                          type="button"
                        >
                          <i className="bi bi-play-circle"></i>Recording
                        </button>
                      </div>

                      {/* Contents */}
                      <div className="tab-content flex-grow-1 overflow-auto" style={{ maxHeight: "400px" }}>
                        {postCallSummaryTab === "requirement" && (
                          <div className="p-3 bg-light rounded-0 border-start border-primary border-3 mb-3">
                            <p className="small text-dark mb-0" style={{ lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                              {lastCallSummary.analysis || "No requirements compiled yet."}
                            </p>
                          </div>
                        )}

                        {postCallSummaryTab === "overall" && (
                          <div className="p-3 bg-light rounded-0 border-start border-primary border-3 mb-3">
                            {loadingPostCallOverall ? (
                              <div className="d-flex align-items-center gap-2 py-2 text-primary">
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                                <span style={{ fontSize: "12px" }}>Generating consolidated summary...</span>
                              </div>
                            ) : (
                              <div className="small text-dark mb-0 markdown-content" style={{ lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                                {postCallOverallSummary || "No overall summary generated yet."}
                              </div>
                            )}
                          </div>
                        )}

                        {postCallSummaryTab === "transcript" && (
                          <div className="d-flex flex-column gap-3">
                            {(() => {
                              try {
                                const rawTurns = JSON.parse(lastCallSummary.transcript || "[]");
                                if (Array.isArray(rawTurns) && rawTurns.length > 0) {
                                  const turns: any[] = [];
                                  rawTurns.forEach((turn: any) => {
                                    const last = turns[turns.length - 1];
                                    if (last && last.speaker === turn.speaker) {
                                      last.text = (last.text + " " + turn.text).trim();
                                      if (turn.translation || last.translation) {
                                        last.translation = ((last.translation || "") + " " + (turn.translation || "")).trim();
                                      }
                                    } else {
                                      turns.push({ ...turn });
                                    }
                                  });
                                  return (
                                    <div className="d-flex flex-column gap-3">
                                      {turns.map((turn: any, idx: number) => {
                                        const isAgent = turn.speaker === "Agent";
                                        const speakerName = isAgent ? "Agent" : (selectedLead?.name || "Lead");
                                        const showTranslation = !!turn.translation && turn.translation !== turn.text;
                                        
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
                                                  ? "bg-white border-light-subtle text-start" 
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
                                                    <span className="badge bg-success bg-opacity-15" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>TRANSLATED TO ENGLISH</span>
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
                                  );
                                }
                              } catch (e) { }
                              return <p className="text-secondary small">No transcript data available.</p>;
                            })()}
                          </div>
                        )}

                        {postCallSummaryTab === "recording" && (
                          <div className="p-3 bg-light rounded-0 border-start border-primary border-3">
                            {lastCallSummary.jobId || lastCallSummary.audioUrl ? (
                              <CustomAudioPlayer
                                src={lastCallSummary.jobId ? `/api/recordings/${lastCallSummary.jobId}` : lastCallSummary.audioUrl}
                                initialDuration={lastCallSummary.duration || 0}
                              />
                            ) : (
                              <p className="text-secondary small mb-0">No audio recording file available.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Regular Dialer UI */
                    <>
                      {/* 1. Lead Profile Banner & Dialer toggle */}
                      <div className="card border p-4 bg-white" style={{ borderRadius: "16px", borderColor: "#cbd5e1" }}>
                        <div className="row g-3 align-items-center justify-content-between">
                          <div className="col-md-8 d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center fw-bold fs-4" style={{ width: "54px", height: "54px" }}>
                              {selectedLead.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="fw-bold mb-1 text-dark">{selectedLead.name}</h4>
                              <div className="d-flex align-items-center flex-wrap gap-2 text-secondary small">
                                <span className="fw-bold text-primary">{selectedLead.phone}</span>
                                {selectedLead.company && (
                                  <>
                                    <span className="text-muted opacity-50">•</span>
                                    <span>{selectedLead.company}</span>
                                  </>
                                )}
                                {selectedLead.email && (
                                  <>
                                    <span className="text-muted opacity-50">•</span>
                                    <span className="font-monospace">{selectedLead.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="col-md-4 text-md-end">
                            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-bold" style={{ fontSize: "12px" }}>
                              <i className="bi bi-shield-check me-1.5 animate-pulse"></i>
                              SIP Trunk Mode Enabled
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Outbound Telephony Dialer Widget */}
                      <div className="row justify-content-center">
                        <div className="col-12 col-md-8 col-lg-6">
                          <div className="card border p-4 bg-white" style={{ borderRadius: "16px", borderColor: "#cbd5e1" }}>

                            {/* Calling Visualizer Header */}
                            <div className="text-center mb-4 pb-3 border-bottom">
                              <div className={`rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3 ${calling ? 'bg-danger pulse-dialer-active' : 'bg-light border text-secondary'
                                }`} style={{ width: 80, height: 80, transition: "all 0.3s" }}>
                                <i className={`bi ${calling ? 'bi-telephone-fill text-white animate-bounce' : 'bi-telephone-outbound text-secondary'} fs-2`}></i>
                              </div>
                              <h5 className="fw-bold mb-1">
                                {calling ? (dialMode === "SIP" ? "Trunk Session Connected" : "Simulating Call Flow...") : "Dialer Console Ready"}
                              </h5>
                              <p className="small text-secondary mb-0">
                                {dialMode === "SIP"
                                  ? (sipStatus === "Registered" ? "Trunk registered & idle" : `SIP: ${sipStatus}`)
                                  : "AI Speech Simulator Engine ready"}
                              </p>
                            </div>

                            {/* Configurations Panel */}
                            <div className="d-flex flex-column gap-3 mb-4">
                              <div className="bg-light p-2.5 rounded-3 border-0 small">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="text-secondary fw-bold text-uppercase x-small">Language Target</span>
                                </div>
                                <select
                                  className="form-select form-select-sm border bg-white"
                                  value={callLanguage}
                                  onChange={(e) => setCallLanguage(e.target.value)}
                                  disabled={calling}
                                >
                                  <option value="English">English</option>
                                  <option value="Spanish">Español</option>
                                  <option value="Hindi">हिन्दी (Hindi)</option>
                                  <option value="Tamil">தமிழ் (Tamil)</option>
                                  <option value="French">Français</option>
                                  <option value="German">Deutsch</option>
                                </select>
                              </div>
                            </div>

                            {/* Timer & Connection Progress */}
                            {calling && (
                              <div className="mb-4 text-center">
                                <div className="fs-3 fw-bold font-monospace mb-2">
                                  {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="progress rounded-pill overflow-hidden" style={{ height: "4px" }}>
                                  <div className="progress-bar bg-success progress-bar-striped progress-bar-animated" style={{ width: "100%" }}></div>
                                </div>
                              </div>
                            )}

                            {/* Action call buttons */}
                            <div className="mt-auto">
                              {!calling && !showOutcome && (
                                <button
                                  className={`btn btn-lg w-100 py-2.5 rounded-pill fw-bold text-white shadow d-flex align-items-center justify-content-center gap-2 ${dialMode === "SIP" ? "btn-primary" : "btn-success"
                                    }`}
                                  onClick={startCall}
                                  disabled={dialMode === "SIP" && sipStatus !== "Registered"}
                                >
                                  {dialMode === "SIP" && sipStatus !== "Registered" ? (
                                    <span className="spinner-border spinner-border-sm me-1.5" role="status"></span>
                                  ) : (
                                    <i className="bi bi-telephone-outbound-fill"></i>
                                  )}
                                  <span>
                                    {dialMode === "SIP"
                                      ? (sipStatus === "Registered" ? "Start Voice Call" : "Activating Trunk...")
                                      : "Start AI Call"}
                                  </span>
                                </button>
                              )}

                              {calling && (
                                <button
                                  className="btn btn-danger btn-lg w-100 py-2.5 rounded-pill fw-bold shadow d-flex align-items-center justify-content-center gap-2"
                                  onClick={handleEndCall}
                                >
                                  <i className="bi bi-telephone-x-fill"></i>
                                  <span>End Call</span>
                                </button>
                              )}

                              {showOutcome && (
                                <div className="animate-fade">
                                  <div className="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-10 py-2 rounded-3 text-center mb-3">
                                    <span className="small text-danger fw-bold"><i className="bi bi-telephone-x-fill me-1"></i> Call Disconnected</span>
                                  </div>
                                  <div className="mb-3">
                                    <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Outcome Stage</label>
                                    <select
                                      className="form-select form-select-sm border"
                                      value={selectedStage}
                                      onChange={(e) => setSelectedStage(e.target.value)}
                                    >
                                      <option value="Interested">Interested / Follow-up</option>
                                      <option value="Enquiry">Enquiry / Request Info</option>
                                      <option value="Desire">Desire / Proposal Stage</option>
                                      <option value="Qualified">Qualified Opportunity</option>
                                      <option value="Closed">Closed / Won</option>
                                      <option value="Not Interested">Not Interested (Failed)</option>
                                    </select>
                                  </div>
                                  <button className="btn btn-dark w-100 py-2 rounded-pill fw-bold shadow-sm" onClick={saveOutcome}>
                                    Sync & Analyze
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* 3. Call History & Transcripts list */}
                      <div className="card border p-4 bg-white" style={{ borderRadius: "16px", borderColor: "#cbd5e1" }}>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-clock-history text-secondary"></i>
                            Call History with {selectedLead.name}
                          </h5>
                          <Link
                            href={`/admin/leads/${selectedLead.id}`}
                            className="btn btn-sm btn-outline-primary px-3 d-flex align-items-center gap-1.5"
                            style={{ fontSize: "13px" }}
                          >
                            <i className="bi bi-person-badge"></i>
                            View Details
                          </Link>
                        </div>

                        {selectedLeadCalls.length === 0 ? (
                          <div className="text-center py-4 text-muted small">
                            No previous calls logged with this customer. Start your first call above!
                          </div>
                        ) : (
                          <div className="row g-4">
                            <div className="col-12">
                              <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: "400px" }}>
                                {selectedLeadCalls.map((log) => {
                                  const dt = new Date(log.createdAt).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true
                                  });
                                  return (
                                    <button
                                      key={log.id}
                                      onClick={() => {
                                        setActiveModalLog(log);
                                        setModalDetailTab("transcript");
                                      }}
                                      className="w-100 text-start border p-3 rounded-3 d-flex justify-content-between align-items-center bg-transparent hover-bg-light"
                                      style={{ transition: "all 0.15s", borderRadius: "12px" }}
                                    >
                                      <div className="d-flex align-items-center gap-3">
                                        <div className="bg-light rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                                          <i className="bi bi-telephone text-primary"></i>
                                        </div>
                                        <div>
                                          <span className="fw-bold text-dark d-block" style={{ fontSize: "14px" }}>{dt}</span>
                                          <span className="text-secondary small">Duration: {log.duration ? `${log.duration}s` : "0s"}</span>
                                        </div>
                                      </div>
                                      <div className="d-flex align-items-center gap-2">
                                        {log.aiScore !== null && (
                                          <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2.5 py-1.5" style={{ fontSize: "12px" }}>
                                            Score: {log.aiScore}%
                                          </span>
                                        )}
                                        <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-2.5 py-1.5" style={{ fontSize: "12px" }}>
                                          {log.stage}
                                        </span>
                                        <i className="bi bi-chevron-right text-secondary ms-1"></i>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="d-flex align-items-center justify-content-center text-muted py-5" style={{ minHeight: "450px" }}>
                  <div className="text-center">
                    <i className="bi bi-telephone-inbound fs-1 text-muted mb-2 d-block opacity-50"></i>
                    Select a lead on the left sidebar to open the Outbound Dialer console
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Syncing Overlay Modal */}
      {isSyncing && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-black bg-opacity-75 animate-fade"
          style={{ backdropFilter: "blur(4px)", zIndex: 9999 }}
        >
          <div className="card text-center p-4 shadow-lg border-0 bg-dark text-white" style={{ borderRadius: "16px", maxWidth: "420px" }}>
            <div className="card-body">
              <div className="spinner-border text-info fs-3 mb-3" role="status" style={{ width: "3.5rem", height: "3.5rem" }}>
                <span className="visually-hidden">Syncing...</span>
              </div>
              <h5 className="fw-bold mb-2 text-white"><i className="bi bi-cloud-arrow-down-fill text-info me-2 animate-pulse"></i>Syncing Call Logs & Analysis</h5>
              <p className="text-secondary small mb-0">
                Downloading voice recording, transcribing using Groq Whisper, and running translation and CRM analysis. Please wait...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Call Details Modal */}
      {activeModalLog && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{
            zIndex: 1060,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease"
          }}
          onClick={() => setActiveModalLog(null)}
        >
          <div
            className="card border-0 shadow-lg p-0 w-100 mx-3 bg-white"
            style={{ maxWidth: "680px", borderRadius: "20px", maxHeight: "85vh", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="card-header bg-white border-bottom border-light-subtle p-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-1" style={{ fontSize: "16px" }}>
                  Call Analysis: {selectedLead?.name || "Customer"}
                </h5>
                <p className="text-secondary mb-0" style={{ fontSize: "12px" }}>
                  Handled by Agent: <strong>{activeModalLog.user?.name || "System"}</strong> on {new Date(activeModalLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                className="btn btn-light rounded-circle p-2 border-0"
                onClick={() => setActiveModalLog(null)}
                style={{ width: "36px", height: "36px" }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="card-body p-4 overflow-auto" style={{ maxHeight: "calc(85vh - 150px)" }}>

              {/* Premium modern tab navigation with gaps and pill style */}
              <div className="d-flex flex-wrap mb-4" style={{ gap: "10px" }}>
                <button
                  onClick={() => handleModalTabChange("requirement")}
                  className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                  style={{
                    fontSize: "13px",
                    borderRadius: "8px",
                    letterSpacing: "0.2px",
                    backgroundColor: modalDetailTab === "requirement" ? "#0d6efd" : "#f1f5f9",
                    color: modalDetailTab === "requirement" ? "#ffffff" : "#475569",
                    boxShadow: modalDetailTab === "requirement" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                  }}
                  type="button"
                >
                  <i className="bi bi-list-task"></i>Requirement
                </button>
                <button
                  onClick={() => handleModalTabChange("overall")}
                  className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                  style={{
                    fontSize: "13px",
                    borderRadius: "8px",
                    letterSpacing: "0.2px",
                    backgroundColor: modalDetailTab === "overall" ? "#0d6efd" : "#f1f5f9",
                    color: modalDetailTab === "overall" ? "#ffffff" : "#475569",
                    boxShadow: modalDetailTab === "overall" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                  }}
                  type="button"
                >
                  <i className="bi bi-intersect"></i>Overall Summary
                </button>
                <button
                  onClick={() => handleModalTabChange("transcript")}
                  className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                  style={{
                    fontSize: "13px",
                    borderRadius: "8px",
                    letterSpacing: "0.2px",
                    backgroundColor: modalDetailTab === "transcript" ? "#0d6efd" : "#f1f5f9",
                    color: modalDetailTab === "transcript" ? "#ffffff" : "#475569",
                    boxShadow: modalDetailTab === "transcript" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                  }}
                  type="button"
                >
                  <i className="bi bi-file-earmark-text"></i>Transcript
                </button>
                <button
                  onClick={() => handleModalTabChange("recording")}
                  className={`btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold transition-all border-0`}
                  style={{
                    fontSize: "13px",
                    borderRadius: "8px",
                    letterSpacing: "0.2px",
                    backgroundColor: modalDetailTab === "recording" ? "#0d6efd" : "#f1f5f9",
                    color: modalDetailTab === "recording" ? "#ffffff" : "#475569",
                    boxShadow: modalDetailTab === "recording" ? "0 4px 12px rgba(13, 110, 253, 0.15)" : "none",
                  }}
                  type="button"
                >
                  <i className="bi bi-play-circle"></i>Call Recording
                </button>
              </div>

              {/* Tab Contents */}
              <div className="tab-content">
                {modalDetailTab === "requirement" && (
                  <div className="p-3 bg-light rounded-0 border-start border-primary border-3 mb-3 animate-fade">
                    <p className="text-dark mb-0" style={{ fontSize: "13.5px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                      {activeModalLog.analysis || "No requirements compiled for this call."}
                    </p>
                  </div>
                )}

                {modalDetailTab === "overall" && (
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

                {modalDetailTab === "transcript" && (
                  <div className="d-flex flex-column gap-3 animate-fade">
                    {(() => {
                      try {
                        const rawTurns = JSON.parse(activeModalLog.transcript || "[]");
                        if (Array.isArray(rawTurns) && rawTurns.length > 0) {
                          const turns: any[] = [];
                          rawTurns.forEach((turn: any) => {
                            const last = turns[turns.length - 1];
                            if (last && last.speaker === turn.speaker) {
                              last.text = (last.text + " " + turn.text).trim();
                              if (turn.translation || last.translation) {
                                last.translation = ((last.translation || "") + " " + (turn.translation || "")).trim();
                              }
                            } else {
                              turns.push({ ...turn });
                            }
                          });
                          return (
                            <div className="d-flex flex-column gap-3">
                              {turns.map((turn: any, idx: number) => {
                                const isAgent = turn.speaker === "Agent";
                                const speakerName = isAgent ? (activeModalLog.user?.name || "Agent") : (selectedLead?.name || "Lead");
                                const showTranslation = !!turn.translation && turn.translation !== turn.text;
                                
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
                                          ? "bg-white border-light-subtle text-start" 
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
                                            <span className="badge bg-success bg-opacity-15" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>TRANSLATED TO ENGLISH</span>
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
                          );
                        }
                      } catch (e) { }
                      return (
                        <p className="text-secondary text-center my-4 small">
                          No readable dialogue turns available.
                        </p>
                      );
                    })()}
                  </div>
                )}

                {modalDetailTab === "recording" && (
                  <div className="d-flex flex-column gap-3 animate-fade">
                    <div className="p-3 bg-light rounded-0 border-start border-primary border-3">
                      <div className="row g-2 text-secondary" style={{ fontSize: "12px" }}>
                        <div className="col-6">
                          <span className="fw-bold">Caller:</span> {activeModalLog.callerPhone || "+1 (555) 019-2834"}
                        </div>
                        <div className="col-6">
                          <span className="fw-bold">Receiver:</span> {activeModalLog.receiverPhone || selectedLead?.phone}
                        </div>
                        <div className="col-6">
                          <span className="fw-bold">Duration:</span> {activeModalLog.duration || 0} seconds
                        </div>
                        <div className="col-6">
                          <span className="fw-bold">Date:</span> {new Date(activeModalLog.startTime || activeModalLog.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex flex-column align-items-center w-100 p-3 bg-light rounded-0 border-start border-primary border-3">
                      <span className="text-secondary fw-bold small uppercase mb-2" style={{ fontSize: "10px", letterSpacing: "1px" }}>PLAY RECORDING</span>
                      <CustomAudioPlayer
                        src={activeModalLog.jobId ? `/api/recordings/${activeModalLog.jobId}` : (activeModalLog.audioUrl || "")}
                        initialDuration={activeModalLog.duration || 0}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="card-footer bg-white border-top border-light-subtle p-3 d-flex justify-content-between">
              {activeModalLog && (
                <Link
                  href={`/admin/calls/${activeModalLog.id}`}
                  className="btn btn-outline-primary px-4 d-flex align-items-center gap-2"
                >
                  <i className="bi bi-eye"></i>
                  View Details
                </Link>
              )}
              <button
                type="button"
                className="btn btn-secondary px-4"
                onClick={() => setActiveModalLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled tags */}
      <style jsx>{`
        .pulse-dialer-active {
          animation: pulse 1.6s infinite;
          background-color: #dc3545 !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.6); }
          70% { transform: scale(1.03); box-shadow: 0 0 0 15px rgba(220, 53, 69, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .text-light-green {
          color: #00ff66;
        }
        .text-cyan {
          color: #00e5ff;
        }
        .text-purple {
          color: #d580ff;
        }
        .hover-bg-light:hover {
          background-color: #f8fafc !important;
        }
        .active-lead-item {
          background-color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
