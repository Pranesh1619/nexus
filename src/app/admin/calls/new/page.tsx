"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveCallLog, getActiveSipConfig, placeRealTwilioCall, placeClickToCall, getCurrentAgent, syncSipCallLog, getCallLogStatus, endTwilioCall, getTwilioCallStatus, assignLeadToAgent } from "./actions";
import { getLeadById } from "@/app/admin/leads/actions";
import { generateConversation } from "@/lib/conversation_mock";

type LeadType = {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  status: string;
};

type SipConfigPreview = {
  domain: string;
  username: string;
  callerId: string;
  codec: string;
  isActive: boolean;
  mockTwilioUrl?: string;
  useRealTwilio?: boolean;
};

function NewCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "";

  // Data states
  const [lead, setLead] = useState<LeadType | null>(null);
  const [sipConfig, setSipConfig] = useState<SipConfigPreview | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Dialer and call state
  const [dialMode, setDialMode] = useState<"SIP" | "AI" | "CTC">("AI");
  const [agentPhone, setAgentPhone] = useState("");
  const [calling, setCalling] = useState(false);
  const [timer, setTimer] = useState(0);
  const [status, setStatus] = useState("Ready to dial");
  const [sipStatus, setSipStatus] = useState("Disconnected");
  const [callError, setCallError] = useState<string | null>(null);

  const [showOutcome, setShowOutcome] = useState(false);
  const [selectedStage, setSelectedStage] = useState("Interested");
  const [isSyncing, setIsSyncing] = useState(false);

  // Advanced speech transcription states
  const [callLanguage, setCallLanguage] = useState("English");
  const [liveTurns, setLiveTurns] = useState<{ speaker: string; text: string; translation?: string; time: string }[]>([]);
  const [callSid, setCallSid] = useState<string | null>(null);

  // SIP Terminal state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const deviceRef = useRef<any>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string>("");

  // Soundwave and pipeline state
  const [pipelineConnected, setPipelineConnected] = useState(false);

  // Load Lead and SIP Config
  useEffect(() => {
    async function loadData() {
      try {
        if (leadId) {
          const l = await getLeadById(leadId);
          if (l) setLead(l as LeadType);
        }

        const agent = await getCurrentAgent();
        if (agent) {
          if (agent.phone) setAgentPhone(agent.phone);
          setCurrentAgentId(agent.id);
        }
        
        const activeSip = await getActiveSipConfig();
        if (activeSip) {
          setSipConfig(activeSip);
          
          if (activeSip.useRealTwilio) {
            if (activeSip.isActive) {
              setDialMode("SIP"); // Default to SIP if enabled
              logToTerminal(`[SYSTEM] Active SIP Trunk detected: ${activeSip.domain}`);
              logToTerminal(`[SYSTEM] Running in REAL Twilio Mode`);
              logToTerminal(`[SYSTEM] Initializing SIP Stack in browser...`);
              
              // Simulate registration (decorative)
              setTimeout(() => {
                logToTerminal(`[TX] REGISTER sip:${activeSip.domain} SIP/2.0`);
                logToTerminal(`     Via: SIP/2.0/WSS client.virpa.ai;branch=z9hG4bK-reg781`);
                logToTerminal(`     From: <sip:${activeSip.username}@${activeSip.domain}>;tag=reg01`);
                logToTerminal(`     To: <sip:${activeSip.username}@${activeSip.domain}>`);
                logToTerminal(`     Call-ID: reg-${Math.random().toString(36).substring(7)}`);
              }, 600);

              setTimeout(() => {
                logToTerminal(`[RX] SIP/2.0 401 Unauthorized`);
                logToTerminal(`     WWW-Authenticate: Digest realm="${activeSip.domain}", nonce="df8924b17"`);
              }, 1100);

              setTimeout(() => {
                logToTerminal(`[TX] REGISTER (With Auth Digest)`);
                logToTerminal(`     Authorization: Digest username="${activeSip.username}", realm="${activeSip.domain}", nonce="df8924b17", response="c7849e8a"`);
              }, 1600);

              setTimeout(() => {
                logToTerminal(`[RX] SIP/2.0 200 OK (Registered)`);
                logToTerminal(`     Contact: <sip:${activeSip.username}@client.virpa.ai;transport=ws>;expires=3600`);
                logToTerminal(`[SIP] SIP Trunk Successfully Registered and Idle.`);
              }, 2200);
            } else {
              logToTerminal(`[SYSTEM] Running in REAL Twilio Mode`);
              logToTerminal(`[SYSTEM] SIP Trunk configuration is inactive. Defaulting to Simulated AI Dialer.`);
            }
          } else {
            // Mock Twilio Mode
            const mockUrl = activeSip.mockTwilioUrl || "http://localhost:5050";
            setDialMode("SIP"); // Allow dialing via Twilio self-hosted replica
            logToTerminal(`[SYSTEM] Running in MOCK Twilio Mode (Self-hosted)`);
            logToTerminal(`[SYSTEM] Self-hosted Twilio replica detected: ${mockUrl}`);
            logToTerminal(`[SYSTEM] Outbound Dialer enabled via local mock server.`);
            setSipStatus("Registered");
          }
        } else {
          logToTerminal(`[SYSTEM] No active SIP Trunk configuration found. Defaulting to Simulated AI Dialer.`);
          logToTerminal(`[SYSTEM] Configure SIP credentials in Admin Settings -> Telephony.`);
        }
      } catch (error) {
        console.error("Error loading call data:", error);
      } finally {
        setIsDataLoaded(true);
      }
    }

    loadData();
  }, [leadId]);

  // Initialize Twilio Voice Device for WebRTC
  useEffect(() => {
    if (!sipConfig || !sipConfig.useRealTwilio || typeof window === "undefined") return;

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
  }, [sipConfig]);

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

  // Poll Twilio call status to automatically disconnect when customer hangs up their phone
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

  // Live conversation streaming based on timer ticks
  useEffect(() => {
    if (!calling || !pipelineConnected) return;

    const simulatedConv = generateConversation(
      lead?.name || "Customer",
      lead?.company || "Independent Entity",
      "Agent",
      callLanguage,
      "Interested"
    );
    
    let parsedTurns: any[] = [];
    try {
      parsedTurns = JSON.parse(simulatedConv.transcript);
    } catch (e) {
      console.error(e);
    }

    const currentTurns: any[] = [];
    parsedTurns.forEach((turn) => {
      const parts = turn.time.split(":");
      const turnSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      if (timer >= turnSeconds) {
        currentTurns.push(turn);
      }
    });

    setLiveTurns(currentTurns);
  }, [timer, calling, pipelineConnected, callLanguage, lead]);

  // Scroll to bottom of terminal
  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

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
    // Clear any leftover timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setCalling(true);
    setTimer(0);
    setPipelineConnected(false);
    setLiveTurns([]);
    setCallSid(null);
    setCallError(null);

    // Auto-assign lead to the current agent when call starts
    if (currentAgentId && leadId) {
      assignLeadToAgent(leadId, currentAgentId);
    }

    const destPhone = lead ? lead.phone : "Unknown Destination";
    const sipUser = sipConfig ? sipConfig.username : "guest";
    const sipDom = sipConfig ? sipConfig.domain : "simulated.voice";
    const codec = sipConfig ? sipConfig.codec : "OPUS";

    if (dialMode === "SIP" && sipConfig) {
      setStatus("Establishing SIP Session...");
      setSipStatus("Dialing");
      
      logToTerminal(`[CALL] Initiating outbound call via Twilio Trunk...`);

      if (sipConfig.useRealTwilio) {
        if (!deviceRef.current) {
          logToTerminal(`[ERROR] Twilio WebRTC Device not ready yet.`);
          setStatus("Failed to connect");
          setSipStatus("Registered");
          setCalling(false);
          return;
        }

        logToTerminal(`[CALL] Requesting microphone access and connecting WebRTC session...`);
        
        let formattedPhone = destPhone.replace(/[^\d+]/g, ""); // Keep only digits and +
        if (!formattedPhone.startsWith("+")) {
          if (formattedPhone.startsWith("91") && formattedPhone.length === 12) {
            formattedPhone = "+" + formattedPhone;
          } else {
            formattedPhone = "+91" + formattedPhone; // Default to India (+91)
          }
        }

        deviceRef.current.connect({
          params: {
            destPhone: formattedPhone,
            leadId: leadId,
            lang: callLanguage,
            userId: currentAgentId || "placeholder"
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
              
              // Register initial call log entry in the background
              syncSipCallLog({
                leadId,
                callSid: sid,
                duration: 0,
                stage: selectedStage,
                userId: currentAgentId || "placeholder"
              });
            }
          });

          twilioCall.on("audio", (audioElement: any) => {
            logToTerminal(`[MEDIA] Remote audio stream received.`);
            if (audioElement && typeof window !== "undefined") {
              // Ensure audio element is appended to DOM to trigger browser speaker output
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
          setCallError(err.message);
          setSipStatus("Registered");
          setCalling(false);
        });

        // Decorative SIP protocol trace logs
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
        // Trigger the mock Twilio voice outbound call
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        placeRealTwilioCall(leadId, origin, callLanguage, currentAgentId || undefined).then((res) => {
          if (res.error) {
            logToTerminal(`[ERROR] Twilio Trunk rejected request: ${res.error}`);
            setStatus("Failed to connect");
            setCallError(res.error);
            setSipStatus("Registered");
            setCalling(false);
          } else {
            setCallSid(res.callSid || null);
            logToTerminal(`[SYSTEM] Twilio session established. Call SID: ${res.callSid}`);
            logToTerminal(`[SYSTEM] Dispatching SIP INVITE request packet...`);
          }
        });
        
        // Step 1: Send INVITE
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

        // Step 2: Receive 100 Trying
        const t2 = setTimeout(() => {
          setStatus("SIP: 100 Trying...");
          logToTerminal(`[RX] SIP/2.0 100 Trying`);
          logToTerminal(`     Content: Trunk Gateway locating outbound trunk routes...`);
        }, 1200);

        // Step 3: Receive 180 Ringing
        const t3 = setTimeout(() => {
          setStatus("SIP: 180 Ringing...");
          logToTerminal(`[RX] SIP/2.0 180 Ringing`);
          logToTerminal(`     Content: Alerting far-end subscriber terminal...`);
        }, 2000);

        // Step 4: Receive 200 OK
        const t4 = setTimeout(() => {
          setStatus("SIP: 200 OK (Answered)");
          setSipStatus("Connected");
          setPipelineConnected(true);
          logToTerminal(`[RX] SIP/2.0 200 OK`);
          logToTerminal(`     Contact: <sip:${destPhone}@${sipDom};transport=ws>`);
          logToTerminal(`     SDP: m=audio 5002 RTP/SAVPF 111`);
          logToTerminal(`     SDP: a=rtpmap:111 ${codec.replace("_", "/")}/48000/2`);
        }, 3500);

        // Step 5: Send ACK & Establish WebRTC audio channel
        const t5 = setTimeout(() => {
          logToTerminal(`[TX] ACK sip:${destPhone}@${sipDom} SIP/2.0`);
          logToTerminal(`[MEDIA] Audio media flow established.`);
          logToTerminal(`[MEDIA] Codec Negotiated: ${codec}`);
          logToTerminal(`[MEDIA] SRTP Encryption Enabled (AES_CM_128_HMAC_SHA1_80)`);
          setStatus("Connected - Audio Active");
        }, 3800);

        timeoutsRef.current = [t1, t2, t3, t4, t5];
      }
    } else if (dialMode === "CTC") {
      setStatus("Calling Agent Mobile...");
      logToTerminal(`[CTC] Initiating Click-to-Call sequence via Twilio REST API...`);
      logToTerminal(`[CTC] Calling Agent mobile: ${agentPhone}`);

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      placeClickToCall({
        leadId,
        agentPhone,
        language: callLanguage,
        userId: currentAgentId || "placeholder",
        currentHost: origin
      }).then((res) => {
        if (res.error) {
          logToTerminal(`[ERROR] Twilio Click-to-Call failed: ${res.error}`);
          setStatus("Failed to connect");
          setCallError(res.error);
          setCalling(false);
        } else {
          setCallSid(res.callSid || null);
          logToTerminal(`[CTC] Outbound call placed to Agent. Call SID: ${res.callSid}`);
          setStatus("Calling Agent...");

          // Register initial call log entry in the background
          if (res.callSid) {
            syncSipCallLog({
              leadId,
              callSid: res.callSid,
              duration: 0,
              stage: selectedStage,
              userId: currentAgentId || "placeholder"
            });
          }

          // In mock mode, simulate agent answering, dialing customer, and bridging
          if (!sipConfig?.useRealTwilio) {
            const t1 = setTimeout(() => {
              setStatus("Agent Answered. Dialing Customer...");
              logToTerminal(`[CTC] Agent answered. Dialing customer: ${destPhone}`);
            }, 2000);

            const t2 = setTimeout(() => {
              setStatus("Connected - Audio Active");
              setPipelineConnected(true);
              logToTerminal(`[CTC] Customer answered. Bridged successfully.`);
            }, 5500);

            timeoutsRef.current = [t1, t2];
          } else {
            // For real Twilio, we'll mark pipeline connected so timer and status show correctly
            setStatus("Bridging Customer...");
            setPipelineConnected(true);
          }
        }
      });
    } else {
      // AI dialer simulator
      setStatus("AI Dialing...");
      logToTerminal(`[AI] Initializing automated outbound dialer...`);
      logToTerminal(`[AI] Dialing lead phone: ${destPhone}`);
      
      const t1 = setTimeout(() => {
        setStatus("Connected - Recording & Transcribing...");
        setPipelineConnected(true);
        logToTerminal(`[AI] Call Connected successfully.`);
        logToTerminal(`[AI] Active Transcript Streaming Session Started.`);
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

    const destPhone = lead ? lead.phone : "Destination";
    const sipUser = sipConfig ? sipConfig.username : "guest";
    const sipDom = sipConfig ? sipConfig.domain : "simulated.voice";

    if ((dialMode === "SIP" || dialMode === "CTC") && sipConfig) {
      setStatus(dialMode === "SIP" ? "SIP: Sending BYE..." : "Ending Twilio Session...");
      if (dialMode === "SIP") {
        setSipStatus("Registered");
        logToTerminal(`[TX] BYE sip:${destPhone}@${sipDom} SIP/2.0`);
        logToTerminal(`     From: "${sipUser}" <sip:${sipUser}@${sipDom}>;tag=hangup`);
        logToTerminal(`     To: <sip:${destPhone}@${sipDom}>`);
      }
      
      if (dialMode === "SIP" && sipConfig.useRealTwilio && deviceRef.current) {
        logToTerminal(`[SYSTEM] Disconnecting WebRTC call device...`);
        deviceRef.current.disconnectAll();
      }

      if (callSid) {
        logToTerminal(`[SYSTEM] Hanging up active Twilio call Session: ${callSid}...`);
        endTwilioCall(callSid).then((res) => {
          if (res?.success) {
            logToTerminal(`[SYSTEM] Live Twilio Call successfully disconnected.`);
          } else {
            console.warn("Twilio call disconnect result:", res?.error);
          }
        });
      }
      
      setTimeout(() => {
        if (dialMode === "SIP") {
          logToTerminal(`[RX] SIP/2.0 200 OK (BYE Processed)`);
          logToTerminal(`[MEDIA] WebRTC connection terminated.`);
          logToTerminal(`[SIP] Trunk Idle.`);
        } else {
          logToTerminal(`[SYSTEM] Twilio Click-to-Call session terminated.`);
        }
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
    if ((dialMode === "SIP" || dialMode === "CTC") && callSid) {
      // Sync the real call via its callSid, either updating the callback data or establishing a placeholder
      result = await syncSipCallLog({
        leadId,
        callSid,
        duration: timer,
        stage: selectedStage,
        userId: currentAgentId || "placeholder"
      });
    } else {
      // Generate the final conversation matching the selected outcome stage and language (AI Simulator fallback)
      const finalConv = generateConversation(
        lead?.name || "Customer",
        lead?.company || "Independent Entity",
        "Agent",
        callLanguage,
        selectedStage
      );
      
      result = await saveCallLog({
        leadId,
        userId: currentAgentId || "placeholder",
        duration: timer,
        status: selectedStage === "Not Interested" ? "FAILED" : "CONNECTED",
        stage: selectedStage, 
        transcript: finalConv.transcript,
        translatedText: finalConv.translatedText,
        detectedVoiceLanguage: finalConv.detectedVoiceLanguage,
        translatedLanguage: finalConv.translatedLanguage,
        wordCount: finalConv.wordCount,
        analysis: finalConv.analysis,
        aiScore: finalConv.aiScore,
        ...(callSid ? { jobId: callSid } : {})
      });
    }

    if (result && result.id && dialMode === "SIP" && callSid) {
      let isReal = false;
      let attempts = 0;
      const maxAttempts = 15; // Wait up to 22.5 seconds total for Twilio + Groq to finish
      
      while (!isReal && attempts < maxAttempts) {
        // Wait 1.5 seconds between status checks
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

    if (result && result.id) {
      router.push(`/admin/calls/${result.id}`);
    } else {
      router.push("/admin/calls");
      setIsSyncing(false);
    }
  };

  if (!isDataLoaded) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Dialing Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Outbound Dialer</h2>
          <p className="text-secondary small">Initiate outbound telephony using physical SIP trunks or simulated AI voice pipelines.</p>
        </div>
        {(sipConfig?.isActive || !sipConfig?.useRealTwilio) && (
          <div className="btn-group shadow-sm" role="group">
            <button
              type="button"
              className={`btn btn-sm px-3 fw-bold ${dialMode === "CTC" ? "btn-primary text-white" : "btn-light border"}`}
              onClick={() => {
                if (!calling) {
                  setDialMode("CTC");
                  logToTerminal(`[SYSTEM] Telephony Mode toggled: Click-to-Call (Mobile First)`);
                }
              }}
              disabled={calling}
            >
              <i className="bi bi-phone-fill me-1.5"></i> Click-to-Call
            </button>
            <button
              type="button"
              className={`btn btn-sm px-3 fw-bold ${dialMode === "SIP" ? "btn-primary text-white" : "btn-light border"}`}
              onClick={() => {
                if (!calling) {
                  setDialMode("SIP");
                  logToTerminal(`[SYSTEM] Telephony Mode toggled: Elastic SIP Trunking`);
                }
              }}
              disabled={calling}
            >
              <i className="bi bi-cloud-fill me-1.5"></i> SIP Trunk
            </button>
            <button
              type="button"
              className={`btn btn-sm px-3 fw-bold ${dialMode === "AI" ? "btn-primary text-white" : "btn-light border"}`}
              onClick={() => {
                if (!calling) {
                  setDialMode("AI");
                  logToTerminal(`[SYSTEM] Telephony Mode toggled: AI Dialer (Simulated)`);
                }
              }}
              disabled={calling}
            >
              <i className="bi bi-cpu-fill me-1.5"></i> AI Simulator
            </button>
          </div>
        )}
      </div>

      <div className="row g-4">
        {/* Left Column: Call Dashboard Panel */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: "16px" }}>
            
            {/* Calling Header Info */}
            <div className="text-center mb-4 pb-3 border-bottom">
              <div className={`rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3 ${
                calling ? 'bg-danger pulse-dialer-active' : 'bg-light border text-secondary'
              }`} style={{ width: 90, height: 90, transition: "all 0.3s" }}>
                <i className={`bi ${calling ? 'bi-telephone-fill text-white animate-bounce' : 'bi-telephone-outbound text-secondary'} fs-1`}></i>
              </div>
              <h4 className="fw-bold mb-1">{lead ? lead.name : "Direct Call"}</h4>
              <p className="text-primary fw-semibold mb-2" style={{ letterSpacing: "0.5px" }}>
                {lead ? lead.phone : "No Phone Number"}
              </p>
              <div className="d-flex justify-content-center align-items-center gap-2">
                <span className={`badge ${
                  dialMode === "SIP" ? "bg-primary text-white" :
                  dialMode === "CTC" ? "bg-success text-white" : "bg-dark bg-opacity-75"
                } small px-2.5 py-1`}>
                  {dialMode === "SIP" ? "SIP TRUNK" :
                   dialMode === "CTC" ? "CLICK-TO-CALL" : "AI SIMULATOR"}
                </span>
                {dialMode === "SIP" && (
                  <span className={`badge px-2.5 py-1 small ${
                    sipStatus === "Registered" ? "bg-success bg-opacity-10 text-success" :
                    sipStatus === "Connected" ? "bg-info bg-opacity-10 text-info" :
                    sipStatus === "Dialing" ? "bg-warning bg-opacity-10 text-warning" :
                    "bg-secondary bg-opacity-10 text-secondary"
                  }`}>
                    {sipStatus}
                  </span>
                )}
              </div>
              {callError && (
                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-10 py-2 px-3 mt-3 mb-0 rounded-3 text-start mx-auto" style={{ maxWidth: "450px" }}>
                  <div className="d-flex gap-2 align-items-start">
                    <i className="bi bi-exclamation-triangle-fill text-danger fs-6 mt-0.5"></i>
                    <div className="small text-danger fw-semibold" style={{ fontSize: "11.5px", lineHeight: "1.4" }}>
                      {callError}
                      {callError.includes("unverified") && (
                        <div className="mt-2 text-secondary fw-normal">
                          To resolve this:
                          <ol className="ps-3 mb-0 mt-1">
                            <li>Go to your <strong>Twilio Console</strong>.</li>
                            <li>Navigate to <strong>Phone Numbers &gt; Verified Caller IDs</strong>.</li>
                            <li>Add and verify this number: <strong>{agentPhone}</strong>.</li>
                            <li>Or upgrade your Twilio account to a paid plan.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Click-to-Call Agent Mobile Settings Widget */}
            {dialMode === "CTC" && (
              <div className="card bg-light border-0 mb-4" style={{ borderRadius: "12px" }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-secondary fw-bold text-uppercase">
                      <i className="bi bi-phone-fill text-success me-2"></i>Agent Device Number
                    </span>
                    <span className="badge bg-success bg-opacity-10 text-success x-small fw-bold">Mobile Ring First</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="x-small text-secondary fw-bold mb-1">Your Mobile Phone Number</label>
                      <input
                        type="tel"
                        className="form-control form-control-sm border-0 bg-white"
                        placeholder="e.g. +919876543210 or +14155552671"
                        value={agentPhone}
                        onChange={(e) => setAgentPhone(e.target.value)}
                        disabled={calling}
                        style={{ fontSize: "12px", borderRadius: "8px", height: "34px" }}
                        required
                      />
                      <div className="x-small text-muted mt-1">Twilio will call this phone number first. When you answer, it will connect the customer.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SIP Active Config Widget */}
            {dialMode === "SIP" && sipConfig && (
              <div className="card bg-light border-0 mb-4" style={{ borderRadius: "12px" }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-secondary fw-bold text-uppercase"><i className="bi bi-diagram-3-fill text-primary me-2"></i>SIP Trunk Server</span>
                    <span className="x-small text-muted font-monospace">{sipConfig.codec}</span>
                  </div>
                  <div className="row g-2 text-dark font-monospace small">
                    <div className="col-6 text-truncate"><span className="text-secondary">Host:</span> {sipConfig.domain}</div>
                    <div className="col-6 text-truncate"><span className="text-secondary">Auth:</span> {sipConfig.username}</div>
                    <div className="col-12"><span className="text-secondary">Caller ID:</span> {sipConfig.callerId}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Speech & Translation Settings */}
            <div className="card bg-light border-0 mb-4" style={{ borderRadius: "12px" }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-secondary fw-bold text-uppercase"><i className="bi bi-translate text-success me-2"></i>Speech & Language Analysis</span>
                  <span className="badge bg-success bg-opacity-10 text-success x-small fw-bold">Live Translation</span>
                </div>
                <div className="row g-2">
                  <div className="col-12">
                    <label className="x-small text-secondary fw-bold mb-1">Target Call Language</label>
                    <select
                      className="form-select form-select-sm border-0 bg-white"
                      value={callLanguage}
                      onChange={(e) => {
                        setCallLanguage(e.target.value);
                        logToTerminal(`[SYSTEM] Target Call Language updated to: ${e.target.value}`);
                      }}
                      disabled={calling}
                      style={{ fontSize: "12px", borderRadius: "8px", height: "34px" }}
                    >
                      <option value="English">English (United States / UK)</option>
                      <option value="Spanish">Español (Spain / Latin America)</option>
                      <option value="Hindi">हिन्दी (India)</option>
                      <option value="Tamil">தமிழ் (India / Sri Lanka)</option>
                      <option value="French">Français (France)</option>
                      <option value="German">Deutsch (Germany)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Flow Visualization */}
            {calling && (
              <div className="mb-4 text-center">
                <div className="fs-2 fw-bold font-monospace mb-3">
                  {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
                </div>
                
                {/* SVG Live Connection Graph */}
                <div className="bg-light p-3 rounded-3 mb-2 shadow-inner border border-light position-relative overflow-hidden" style={{ minHeight: "80px" }}>
                  <svg className="w-100" height="50" viewBox="0 0 400 50">
                    {/* Background paths */}
                    <line x1="20" y1="25" x2="380" y2="25" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                    
                    {/* Active flow path */}
                    {pipelineConnected && (
                      <line 
                        x1="20" 
                        y1="25" 
                        x2="380" 
                        y2="25" 
                        stroke={dialMode === "SIP" ? "#0d6efd" : "#198754"} 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        strokeDasharray="8,8"
                        className="svg-flow-animation"
                      />
                    )}

                    {/* Node 1: Browser/Agent */}
                    <circle 
                      cx="20" 
                      cy="25" 
                      r="8" 
                      fill="#ffffff" 
                      stroke={dialMode === "CTC" ? "#198754" : "#212529"} 
                      strokeWidth="3" 
                    />
                    {/* Node 2: Trunk */}
                    <circle 
                      cx="200" 
                      cy="25" 
                      r="8" 
                      fill="#ffffff" 
                      stroke={dialMode === "CTC" ? "#198754" : "#0d6efd"} 
                      strokeWidth="3" 
                    />
                    {/* Node 3: Target */}
                    <circle cx="380" cy="25" r="8" fill="#ffffff" stroke="#198754" strokeWidth="3" />
                  </svg>
                  
                  <div className="d-flex justify-content-between px-1 x-small fw-bold text-secondary mt-1">
                    <span>{dialMode === "CTC" ? "Agent Mobile" : "Softphone Browser"}</span>
                    <span>{dialMode === "SIP" ? "SIP Proxy Gateway" : dialMode === "CTC" ? "Twilio Cloud" : "AI Dial Server"}</span>
                    <span>Customer Trunk</span>
                  </div>
                </div>
                <div className="small text-secondary">
                  {pipelineConnected ? (
                    <span className="text-success"><i className="bi bi-check-all me-1"></i> RTP Audio Streaming Active</span>
                  ) : (
                    <span>Negotiating RTC Handshake...</span>
                  )}
                </div>
              </div>
            )}

            {/* Live Transcript Streaming Display (Only for AI Simulator) */}
            {dialMode === "AI" && (calling || showOutcome || liveTurns.length > 0) && (
              <div className="mb-4 animate-fade">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                  <span className="small text-secondary fw-bold text-uppercase">
                    <i className="bi bi-chat-text text-primary me-2"></i>Live Speech Transcript
                  </span>
                  <span className="x-small text-muted font-monospace">{callLanguage} ({liveTurns.length} turns)</span>
                </div>
                <div 
                  className="bg-light p-3 rounded-3 border overflow-auto" 
                  style={{ maxHeight: "200px", minHeight: "120px", display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  {liveTurns.length === 0 ? (
                    <div className="text-secondary opacity-50 x-small text-center py-4">
                      <span className="spinner-grow spinner-grow-sm text-primary me-1.5" role="status"></span>
                      Listening for speech...
                    </div>
                  ) : (
                    liveTurns.map((turn, idx) => {
                      const isAgent = turn.speaker === "Agent";
                      return (
                        <div key={idx} className={`d-flex flex-column ${isAgent ? "align-items-start" : "align-items-end"}`}>
                          <div className={`p-2.5 rounded-3 px-3 shadow-sm x-small ${
                            isAgent 
                              ? "bg-white text-dark border-start border-primary border-3" 
                              : "bg-success bg-opacity-10 text-dark border-end border-success border-3 text-end"
                          }`} style={{ maxWidth: "85%" }}>
                            <div className="fw-bold mb-0.5" style={{ fontSize: "10px", color: isAgent ? "#0d6efd" : "#198754" }}>
                              {isAgent ? "Agent" : (lead?.name || "Customer")} • {turn.time}
                            </div>
                            <div className="text-dark fw-medium">{turn.text}</div>
                            {turn.translation && turn.translation !== turn.text && (
                              <div className="mt-1 pt-1 border-top border-secondary border-opacity-10 text-muted x-small style-italic" style={{ fontSize: "9px" }}>
                                <span className="fw-bold text-secondary">EN:</span> {turn.translation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Dialer Call Buttons */}
            <div className="d-flex gap-3 justify-content-center mt-auto">
              {!calling && !showOutcome && (
                <button 
                  className={`btn btn-lg w-100 py-3 rounded-pill fw-bold text-white shadow d-flex align-items-center justify-content-center gap-2 ${
                    dialMode === "SIP" ? "btn-primary" :
                    dialMode === "CTC" ? "btn-success" : "btn-dark"
                  }`} 
                  onClick={startCall}
                  disabled={
                    (dialMode === "SIP" && sipStatus !== "Registered") ||
                    (dialMode === "CTC" && !agentPhone)
                  }
                >
                  {dialMode === "SIP" && sipStatus !== "Registered" ? (
                    <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-telephone-outbound-fill"></i>
                  )}
                  <span>
                    {dialMode === "SIP" 
                      ? (sipStatus === "Registered" ? "Initiate Trunk Call" : "Registering SIP softphone...") 
                      : dialMode === "CTC"
                      ? "Start Click-to-Call"
                      : "Launch AI Call"}
                  </span>
                </button>
              )}
              
              {calling && (
                <button 
                  className="btn btn-danger btn-lg w-100 py-3 rounded-pill fw-bold shadow d-flex align-items-center justify-content-center gap-2" 
                  onClick={handleEndCall}
                >
                  <i className="bi bi-telephone-x-fill"></i>
                  <span>Disconnect Call</span>
                </button>
              )}

              {showOutcome && (
                <div className="w-100 animate-fade">
                  <div className="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-10 d-flex align-items-center gap-2 mb-3 py-2.5 rounded-3 animate-pulse">
                    <i className="bi bi-telephone-x-fill text-danger fs-5"></i>
                    <div>
                      <div className="fw-bold small text-danger">Call Disconnected</div>
                      <div className="x-small text-secondary">The voice session has ended. Choose the call outcome stage below.</div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary text-uppercase mb-1">Call Outcome / Next Stage</label>
                    <select 
                      className="form-select form-select-lg border"
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                      style={{ fontSize: "15px", borderRadius: "10px" }}
                    >
                      <option value="Interested">Interested / Follow-up</option>
                      <option value="Enquiry">Enquiry / Request Info</option>
                      <option value="Desire">Desire / Proposal Stage</option>
                      <option value="Qualified">Qualified Opportunity</option>
                      <option value="Closed">Closed / Won</option>
                      <option value="Not Interested">Not Interested (Failed)</option>
                    </select>
                  </div>
                  <button className="btn btn-dark btn-lg w-100 py-3 rounded-pill fw-bold shadow-sm" onClick={saveOutcome}>
                    Sync Call Logs & Analysis
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-center gap-2 text-secondary x-small">
              <i className="bi bi-shield-lock-fill text-success"></i>
              <span>Outbound call is automatically logged and recorded</span>
            </div>
          </div>
        </div>

        {/* Right Column: SIP Signaling Protocol Console */}
        <div className="col-lg-6">
          <div 
            className="card bg-dark border-0 shadow-sm h-100 d-flex flex-column" 
            style={{ 
              borderRadius: "16px",
              minHeight: "450px"
            }}
          >
            <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 py-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <span className="rounded-circle bg-danger" style={{ width: 10, height: 10 }}></span>
                <span className="rounded-circle bg-warning" style={{ width: 10, height: 10 }}></span>
                <span className="rounded-circle bg-success" style={{ width: 10, height: 10 }}></span>
                <span className="text-secondary small fw-bold font-monospace ms-2">sip_trunk_signaling_log.sh</span>
              </div>
              <button 
                onClick={clearTerminal} 
                className="btn btn-outline-secondary btn-sm font-monospace border-0"
                style={{ fontSize: "11px" }}
                title="Clear Terminal Output"
              >
                <i className="bi bi-trash3 me-1"></i> CLEAR
              </button>
            </div>
            
            <div 
              ref={consoleContainerRef}
              className="card-body p-4 font-monospace overflow-auto bg-black bg-opacity-75 flex-grow-1"
              style={{ 
                height: "380px", 
                fontSize: "11.5px", 
                color: "#00FF66",
                lineHeight: "1.5"
              }}
            >
              {terminalLogs.length === 0 ? (
                <div className="text-secondary opacity-50 py-5 text-center">
                  -- Terminal idling. Telephony actions will dump SIP log traces here --
                </div>
              ) : (
                terminalLogs.map((log, idx) => {
                  let logClass = "text-light-green";
                  if (log.includes("[TX]")) logClass = "text-cyan";
                  if (log.includes("[RX]")) logClass = "text-warning";
                  if (log.includes("[SYSTEM]")) logClass = "text-secondary opacity-75";
                  if (log.includes("[ERROR]") || log.includes("[WARNING]")) logClass = "text-danger fw-bold";
                  if (log.includes("[MEDIA]")) logClass = "text-purple";
                  
                  return (
                    <div key={idx} className={`mb-1 ${logClass}`} style={{ whiteSpace: "pre-wrap" }}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {isSyncing && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-black bg-opacity-75 animate-fade"
          style={{ backdropFilter: "blur(4px)", zIndex: 9999 }}
        >
          <div className="card text-center p-4 shadow-lg border-0 bg-dark text-white animate-bounce-in" style={{ borderRadius: "16px", maxWidth: "420px" }}>
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
        .svg-flow-animation {
          animation: svgFlow 1.5s linear infinite;
        }
        @keyframes svgFlow {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
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
