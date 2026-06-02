import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";
import { parseTwiML } from "./twiml-parser";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || "5050";
const TELEPHONY_MODE = process.env.TELEPHONY_MODE || (process.env.ASTERISK_HOST ? "asterisk" : "simulator");

const RECORDINGS_DIR = path.join(process.cwd(), "recordings");
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Memory store for active simulator calls
interface SimCall {
  sid: string;
  to: string;
  from: string;
  url: string;
  recordingStatusCallback: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
  dateCreated: string;
  lang: string;
}
const activeSimCalls = new Map<string, SimCall>();

interface TelnyxCallSession {
  actions: any[];
  currentActionIndex: number;
  recordingCallback: string;
  leadId: string;
  lang: string;
  originalUrl: string;
}
const activeTelnyxCalls = new Map<string, TelnyxCallSession>();

const VERIFIED_FILE = path.join(process.cwd(), "verified.json");
const verifiedPhoneNumbers = new Set<string>(["+12706795659"]);

// Load verified numbers from file
if (fs.existsSync(VERIFIED_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(VERIFIED_FILE, "utf-8"));
    if (Array.isArray(data)) {
      data.forEach((num) => verifiedPhoneNumbers.add(num));
    }
  } catch (e) {
    console.error("[Twilio Mock] Failed to read verified.json:", e);
  }
}

function saveVerifiedNumbers() {
  try {
    fs.writeFileSync(VERIFIED_FILE, JSON.stringify(Array.from(verifiedPhoneNumbers), null, 2));
  } catch (e) {
    console.error("[Twilio Mock] Failed to write verified.json:", e);
  }
}



// Handle form-url-encoded payloads (Twilio SDK formats requests as application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static recording files so our Next.js backend can download them
app.use("/recordings", express.static(RECORDINGS_DIR));

// Interactive Dashboard for Developers
app.get("/", (req, res) => {
  const currentDomain = process.env.SIP_DOMAIN || "Not Configured";
  const currentUser = process.env.SIP_USER || "Not Configured";
  const currentPass = process.env.SIP_PASS || "";
  const currentAppUrl = process.env.APP_URL || "http://localhost:5050";
  const currentMode = process.env.TELEPHONY_MODE || "simulator";
  const currentTelnyxApiKey = process.env.TELNYX_API_KEY || "";
  const currentTelnyxConnectionId = process.env.TELNYX_CONNECTION_ID || "";

  const verifiedListHtml = Array.from(verifiedPhoneNumbers).map(num => `
    <div class="d-flex justify-content-between align-items-center p-2 mb-2 bg-black bg-opacity-25 rounded small text-white">
      <span><i class="bi bi-shield-check text-success me-2"></i>${num}</span>
      <span class="badge bg-success-subtle text-success border border-success-subtle">VERIFIED</span>
    </div>
  `).join("");



  const callListHtml = Array.from(activeSimCalls.values()).reverse().map(call => `
    <div class="call-card" style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div class="call-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
        <span class="call-sid" style="font-family: monospace; color: #38bdf8;">${call.sid}</span>
        <span class="badge ${
          call.status === 'queued' ? 'bg-secondary' :
          call.status === 'ringing' ? 'bg-warning text-dark' :
          call.status === 'in-progress' ? 'bg-primary' :
          call.status === 'completed' ? 'bg-success' : 'bg-danger'
        }">${call.status.toUpperCase()}</span>
      </div>
      <div class="call-body" style="font-size: 14px;">
        <p class="mb-1"><strong>To:</strong> ${call.to}</p>
        <p class="mb-1"><strong>From:</strong> ${call.from}</p>
        <p class="mb-1"><strong>Language:</strong> ${call.lang}</p>
        <p class="mb-2"><strong>TwiML URL:</strong> <a href="${call.url}" target="_blank" style="color: #38bdf8; word-break: break-all;">${call.url}</a></p>
        ${call.status === 'completed' ? `
          <div class="audio-player mt-2">
            <audio controls src="/recordings/rec_${call.sid}.wav" style="width: 100%; height: 35px;"></audio>
          </div>
        ` : ''}
      </div>
    </div>
  `).join("");

  let templatesHtml = "";
  try {
    templatesHtml = fs.readdirSync(RECORDINGS_DIR)
      .filter(f => f.endsWith(".wav") && !f.startsWith("rec_"))
      .map(f => `
        <div class="template-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
          <span><i class="bi bi-file-earmark-music text-primary me-2"></i>${f}</span>
          <audio controls src="/recordings/${f}" style="height: 28px; width: 150px;"></audio>
        </div>
      `).join("");
  } catch (e) {}

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Twilio API Mock Console</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
  <style>
    body {
      background-color: #0f172a;
      color: #e2e8f0;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    .hero {
      background: linear-gradient(135deg, #1e1b4b, #311042);
      border-bottom: 1px solid #4c1d95;
    }
    .card-dark {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
    }
    .nav-tabs .nav-link {
      color: #94a3b8;
      border: 0;
      border-bottom: 3px solid transparent;
      font-weight: 600;
    }
    .nav-tabs .nav-link.active {
      color: #f43f5e;
      background-color: transparent;
      border-bottom: 3px solid #f43f5e;
    }
    .nav-tabs .nav-link:hover {
      border-color: transparent;
      color: #f1f5f9;
    }
    .form-control-dark {
      background-color: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
    }
    .form-control-dark:focus {
      background-color: #0f172a;
      border-color: #f43f5e;
      color: #f8fafc;
      box-shadow: 0 0 0 0.25rem rgba(244, 63, 94, 0.25);
    }
  </style>
</head>
<body>
  <div class="hero py-4 mb-4">
    <div class="container">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div class="d-flex align-items-center">
          <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Twilio-logo-red.svg" alt="Twilio Logo" style="height: 36px; margin-right: 16px; filter: drop-shadow(0 0 8px rgba(244,63,94,0.4));">
          <div>
            <h1 class="fw-bold mb-0 fs-3">Twilio Self-Hosted Console</h1>
            <p class="text-secondary mb-0 small">Bypass expensive APIs: Local Developer SIP Gateway</p>
          </div>
        </div>
        <div>
          <span class="badge bg-success p-2.5 fs-7"><i class="bi bi-check-circle-fill me-1.5"></i> GATEWAY MODE: ${TELEPHONY_MODE.toUpperCase()}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="container mb-5">
    <!-- Navigation Tabs -->
    <ul class="nav nav-tabs mb-4" id="consoleTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="dashboard-tab" data-bs-toggle="tab" data-bs-target="#dashboard" type="button" role="tab"><i class="bi bi-telephone-outbound me-2"></i>Live Activity</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="sip-tab" data-bs-toggle="tab" data-bs-target="#sip" type="button" role="tab"><i class="bi bi-sliders me-2"></i>SIP Trunk Settings</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="twiml-tab" data-bs-toggle="tab" data-bs-target="#twiml" type="button" role="tab"><i class="bi bi-code-slash me-2"></i>TwiML Tester</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="verify-tab" data-bs-toggle="tab" data-bs-target="#verify" type="button" role="tab"><i class="bi bi-shield-check me-2"></i>Verify Caller IDs</button>
      </li>
    </ul>

    <div class="tab-content" id="consoleTabContent">
      <!-- Tab 1: Live Activity -->
      <div class="tab-pane fade show active" id="dashboard" role="tabpanel">
        <div class="row g-4">
          <div class="col-lg-8">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h3 class="fw-bold fs-5 mb-0"><i class="bi bi-clock-history text-primary me-2"></i>Recent Call Log</h3>
              <button onclick="window.location.reload()" class="btn btn-sm btn-outline-secondary"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
            </div>
            <div id="calls-container">
              ${callListHtml.length > 0 ? callListHtml : `
                <div class="text-center py-5 card-dark">
                  <i class="bi bi-telephone-x fs-1 text-secondary mb-3 d-block"></i>
                  <p class="text-muted mb-0">No simulated calls placed yet. Use the Next.js outbound dialer to initiate calls.</p>
                </div>
              `}
            </div>
          </div>

          <div class="col-lg-4">
            <div class="card card-dark p-4 mb-4">
              <h4 class="fw-bold fs-5 mb-3"><i class="bi bi-info-circle text-info me-2"></i>Quick Specs</h4>
              <p class="small text-secondary mb-2">Active Target URL for Next.js App</p>
              <div class="bg-black bg-opacity-50 p-3 rounded font-monospace small mb-3 text-white">
                MOCK_TWILIO_URL=http://localhost:5050
              </div>
              <p class="small text-secondary mb-0">
                Registered Domain: <strong class="text-white">${currentDomain}</strong><br>
                SIP User: <strong class="text-white">${currentUser}</strong><br>
                App Webhook URL: <strong class="text-white">${currentAppUrl}</strong>
              </p>
            </div>

            <div class="card card-dark p-4">
              <h4 class="fw-bold fs-5 mb-3"><i class="bi bi-translate text-success me-2"></i>Language Templates</h4>
              <p class="small text-secondary mb-3">
                Drop <code>tamil.wav</code> or <code>hindi.wav</code> templates in <code>twilio/recordings/</code> to test native language voice transcription.
              </p>
              <div class="templates-list">
                ${templatesHtml || `<p class="text-muted small mb-0">No templates added yet. Silence generator active.</p>`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: SIP Trunk settings form -->
      <div class="tab-pane fade" id="sip" role="tabpanel">
        <div class="card card-dark p-4 mx-auto" style="max-width: 600px;">
          <h3 class="fw-bold fs-5 mb-3"><i class="bi bi-sliders text-warning me-2"></i>Manage SIP Trunk Credentials</h3>
          <p class="small text-secondary mb-4">Configure your credentials. When saved, this dynamically updates your <code>.env</code> file and registers immediately.</p>
          
          <form action="/api/settings" method="POST">
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">TELEPHONY MODE</label>
              <select name="telephonyMode" class="form-select form-control-dark" onchange="toggleTelnyxFields(this.value)">
                <option value="simulator" ${currentMode === 'simulator' ? 'selected' : ''}>Simulator (Mock Call Lifecycle)</option>
                <option value="telnyx" ${currentMode === 'telnyx' ? 'selected' : ''}>Telnyx (Real Outbound Calls via REST API)</option>
                <option value="asterisk" ${currentMode === 'asterisk' ? 'selected' : ''}>Asterisk (Local PBX Bridge - Docker)</option>
              </select>
            </div>

            <!-- Telnyx Specific Fields -->
            <div id="telnyx-fields" style="display: ${currentMode === 'telnyx' ? 'block' : 'none'}; border: 1px solid #334155; padding: 15px; border-radius: 8px; margin-bottom: 20px; background-color: rgba(244, 63, 94, 0.05);">
              <h5 class="fw-bold text-danger small mb-3">Telnyx API Credentials</h5>
              <div class="mb-3">
                <label class="form-label text-secondary small fw-bold">TELNYX API KEY</label>
                <input type="password" name="telnyxApiKey" class="form-control form-control-dark" value="${currentTelnyxApiKey}" placeholder="e.g. KEY0182C...">
              </div>
              <div class="mb-0">
                <label class="form-label text-secondary small fw-bold">TELNYX OUTBOUND CONNECTION ID</label>
                <input type="text" name="telnyxConnectionId" class="form-control form-control-dark" value="${currentTelnyxConnectionId}" placeholder="e.g. 12345678-abcd...">
              </div>
            </div>

            <!-- SIP Auth Fields (Asterisk Mode) -->
            <div id="sip-fields" style="display: ${currentMode === 'telnyx' ? 'none' : 'block'};">
              <div class="mb-3">
                <label class="form-label text-secondary small fw-bold">SIP DOMAIN / HOST</label>
                <input type="text" name="sipDomain" class="form-control form-control-dark" value="${currentDomain}" placeholder="e.g. phone.provider.com">
              </div>
              
              <div class="mb-3">
                <label class="form-label text-secondary small fw-bold">SIP USERNAME</label>
                <input type="text" name="sipUser" class="form-control form-control-dark" value="${currentUser}">
              </div>

              <div class="mb-3">
                <label class="form-label text-secondary small fw-bold">SIP PASSWORD</label>
                <input type="password" name="sipPass" class="form-control form-control-dark" value="${currentPass}">
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label text-secondary small fw-bold">LOCAL APP WEBHOOK URL</label>
              <input type="text" name="appUrl" class="form-control form-control-dark" value="${currentAppUrl}">
            </div>

            <button type="submit" class="btn btn-danger w-100 fw-bold"><i class="bi bi-save me-2"></i>Save Configuration</button>
          </form>
        </div>
      </div>

      <script>
        function toggleTelnyxFields(mode) {
          const telnyxFields = document.getElementById('telnyx-fields');
          const sipFields = document.getElementById('sip-fields');
          if (mode === 'telnyx') {
            telnyxFields.style.display = 'block';
            sipFields.style.display = 'none';
          } else {
            telnyxFields.style.display = 'none';
            sipFields.style.display = 'block';
          }
        }
      </script>

      <!-- Tab 3: TwiML Tester -->
      <div class="tab-pane fade" id="twiml" role="tabpanel">
        <div class="card card-dark p-4">
          <h3 class="fw-bold fs-5 mb-3"><i class="bi bi-code-slash text-danger me-2"></i>TwiML Flow Sandbox</h3>
          <p class="small text-secondary mb-4">Fetch and test how your Next.js TwiML dial-plan executes. Paste your voice endpoint URL below.</p>
          
          <div class="row g-3 mb-4">
            <div class="col-md-9">
              <input type="text" id="twimlTestUrl" class="form-control form-control-dark" placeholder="e.g. http://localhost:3000/api/twilio/voice?leadId=123" value="http://localhost:3000/api/twilio/voice?leadId=mock_lead">
            </div>
            <div class="col-md-3">
              <button onclick="testTwiML()" class="btn btn-danger w-100 fw-bold"><i class="bi bi-play-circle me-2"></i>Test Flow</button>
            </div>
          </div>

          <div id="twimlResult" style="display: none;">
            <div class="row g-4">
              <div class="col-md-6">
                <h5 class="fw-bold small text-secondary">TwiML Response (XML)</h5>
                <pre class="bg-black bg-opacity-50 p-3 rounded text-success small" id="twimlXml" style="max-height: 300px; overflow: auto;"></pre>
              </div>
              <div class="col-md-6">
                <h5 class="fw-bold small text-secondary">Parsed Call Execution Steps</h5>
                <div class="bg-black bg-opacity-50 p-3 rounded small" id="twimlActions" style="max-height: 300px; overflow: auto;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 4: Verify Caller IDs -->
      <div class="tab-pane fade" id="verify" role="tabpanel">
        <div class="row g-4">
          <div class="col-md-6">
            <div class="card card-dark p-4">
              <h3 class="fw-bold fs-5 mb-3"><i class="bi bi-shield-plus text-success me-2"></i>Verify Outbound Caller ID</h3>
              <p class="small text-secondary mb-4">Register your custom phone number (e.g. mobile number) with the local Twilio mock server so you can use it as the caller ID.</p>
              
              <div class="mb-3">
                <label class="form-label text-secondary small fw-bold">PHONE NUMBER TO VERIFY</label>
                <input type="text" id="verifyPhoneInput" class="form-control form-control-dark" placeholder="e.g. +919876543210" value="+91">
              </div>

              <button onclick="requestVerificationCode()" class="btn btn-success w-100 fw-bold"><i class="bi bi-telephone-plus me-2"></i>Request Verification Code</button>

              <div id="verificationResult" class="mt-4 text-center" style="display: none;">
                <div class="p-3 bg-success bg-opacity-10 border border-success rounded">
                  <p class="small text-success mb-2 fw-bold">Verification Call Initiated!</p>
                  <p class="small text-secondary mb-3">Your phone will ring. Answer it and enter this code:</p>
                  <div class="fs-2 fw-bold text-success font-monospace tracking-widest" id="verificationCodeDisplay">123456</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card card-dark p-4">
              <h3 class="fw-bold fs-5 mb-3"><i class="bi bi-check-all text-info me-2"></i>Verified Phone Numbers</h3>
              <p class="small text-secondary mb-4">Numbers below are whitelisted as valid Outbound Caller IDs.</p>
              <div id="verified-numbers-container">
                ${verifiedListHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // Keep active tab state on reload
    document.addEventListener("DOMContentLoaded", () => {
      const activeTab = localStorage.getItem("activeConsoleTab");
      if (activeTab) {
        const tabEl = document.querySelector("#" + activeTab);
        if (tabEl) {
          const tab = new bootstrap.Tab(tabEl);
          tab.show();
        }
      }
      
      const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
      tabEls.forEach(el => {
        el.addEventListener('shown.bs.tab', (event) => {
          localStorage.setItem("activeConsoleTab", event.target.id);
        });
      });
    });

    async function testTwiML() {
      const url = document.getElementById("twimlTestUrl").value;
      if (!url) return alert("Please enter a test URL");
      
      const resContainer = document.getElementById("twimlResult");
      const xmlContainer = document.getElementById("twimlXml");
      const actionsContainer = document.getElementById("twimlActions");
      
      try {
        const response = await fetch("/api/test-twiml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testUrl: url })
        });
        const data = await response.json();
        
        if (data.success) {
          resContainer.style.display = "block";
          xmlContainer.textContent = data.twiml;
          
          let actionsHtml = "";
          data.actions.forEach((act, idx) => {
            if (act.type === "say") {
              actionsHtml += '<div class="mb-2"><span class="badge bg-primary me-2">Say</span> "<i>' + act.text + '</i>" (lang: ' + (act.language || "default") + ')</div>';
            } else if (act.type === "record") {
              actionsHtml += '<div class="mb-2"><span class="badge bg-warning text-dark me-2">Record</span> MaxLength: ' + (act.maxLength || 60) + 's, PlayBeep: yes</div>';
            } else if (act.type === "hangup") {
              actionsHtml += '<div class="mb-2"><span class="badge bg-danger me-2">Hangup</span> Call Ends</div>';
            }
          });
          actionsContainer.innerHTML = actionsHtml || "<p class='text-muted'>No actions found.</p>";
        } else {
          alert("Error: " + data.error);
        }
      } catch (err) {
        alert("Failed to run sandbox: " + err.message);
      }
    }

    async function requestVerificationCode() {
      const phoneInput = document.getElementById("verifyPhoneInput").value;
      if (!phoneInput || phoneInput === "+91" || phoneInput.trim().length < 5) {
        return alert("Please enter a valid phone number");
      }

      try {
        const response = await fetch("/api/verify-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: phoneInput })
        });
        const data = await response.json();
        if (data.success) {
          document.getElementById("verificationResult").style.display = "block";
          document.getElementById("verificationCodeDisplay").textContent = data.validationCode;
          
          // Dynamically prepend to verified list
          const container = document.getElementById("verified-numbers-container");
          if (container) {
            const html = '<div class="d-flex justify-content-between align-items-center p-2 mb-2 bg-black bg-opacity-25 rounded small text-white">' +
              '<span><i class="bi bi-shield-check text-success me-2"></i>' + phoneInput + '</span>' +
              '<span class="badge bg-success-subtle text-success border border-success-subtle">VERIFIED</span>' +
              '</div>';
            container.insertAdjacentHTML('afterbegin', html);
          }
        } else {
          alert("Error: " + data.error);
        }
      } catch (e) {
        alert("Failed to request code: " + e.message);
      }
    }
  </script>
</body>
</html>
  `);
});

// Dynamic settings update
app.post("/api/settings", (req, res) => {
  const { sipDomain, sipUser, sipPass, appUrl, telephonyMode, telnyxApiKey, telnyxConnectionId } = req.body;
  const envPath = path.join(process.cwd(), ".env");

  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const updates: Record<string, string> = {
    SIP_DOMAIN: sipDomain || "",
    SIP_USER: sipUser || "",
    SIP_PASS: sipPass || "",
    APP_URL: appUrl || "http://localhost:5050",
    TELEPHONY_MODE: telephonyMode || "simulator",
    TELNYX_API_KEY: telnyxApiKey || "",
    TELNYX_CONNECTION_ID: telnyxConnectionId || ""
  };

  let newLines: string[] = [];
  const processedKeys = new Set<string>();

  if (envContent) {
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        if (updates[key] !== undefined) {
          newLines.push(key + "=" + updates[key]);
          processedKeys.add(key);
          continue;
        }
      }
      newLines.push(line);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!processedKeys.has(key)) {
      newLines.push(key + "=" + value);
    }
  }

  fs.writeFileSync(envPath, newLines.join("\n"));

  // Reload configurations in active memory
  process.env.SIP_DOMAIN = sipDomain;
  process.env.SIP_USER = sipUser;
  process.env.SIP_PASS = sipPass;
  process.env.APP_URL = appUrl;
  process.env.TELEPHONY_MODE = telephonyMode;
  process.env.TELNYX_API_KEY = telnyxApiKey;
  process.env.TELNYX_CONNECTION_ID = telnyxConnectionId;

  console.log(`[SIMULATOR] Settings saved successfully. Mode is set to: ${telephonyMode}`);
  res.redirect("/");
});

// Outbound Phone Number Verification API
app.post("/api/verify-number", (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: "Phone number is required." });
  }

  const formatted = phoneNumber.trim();
  verifiedPhoneNumbers.add(formatted);
  saveVerifiedNumbers();

  console.log(`[Twilio Mock] Outbound Caller ID Verified: ${formatted}`);
  res.json({ success: true, validationCode: "123456" });
});

// Sandbox API to fetch and parse TwiML
app.post("/api/test-twiml", async (req, res) => {
  const { testUrl } = req.body;
  try {
    const response = await axios.get(testUrl);
    const actions = await parseTwiML(response.data);
    res.json({ success: true, twiml: response.data, actions });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// Helper to generate a valid PCM 16-bit 8000Hz mono WAV file containing silence
function generateSilenceWav(durationSeconds: number): Buffer {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = durationSeconds * sampleRate * numChannels * bytesPerSample;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44 + dataSize);

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);

  // Format chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // Byte rate
  header.writeUInt16LE(numChannels * bytesPerSample, 32); // Block align
  header.writeUInt16LE(bitsPerSample, 34);

  // Data chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  // The rest of the buffer is initialized to 0 (silence)

  return header;
}

function resolveUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      // Direct traffic locally to NEXTJS_BACKEND_URL
      const localBackend = process.env.NEXTJS_BACKEND_URL || "http://localhost:3000";
      const backendUrl = new URL(localBackend);
      parsed.protocol = backendUrl.protocol;
      parsed.host = backendUrl.host;
      console.log(`[SIMULATOR] Redirecting external URL ${url} -> local backend: ${parsed.toString()}`);
      return parsed.toString();
    }
  } catch (e) {
    // Ignore
  }
  return url;
}

async function triggerRecordingCallback(call: SimCall) {
  if (!call.recordingStatusCallback) {
    console.log(`[SIMULATOR] Call ${call.sid}: No recordingStatusCallback provided. Skipping callback.`);
    return;
  }

  console.log(`[SIMULATOR] Call ${call.sid}: Preparing call recording file...`);

  // Choose the recording file based on language query parameter
  const langKey = call.lang.toLowerCase();
  const specificFile = path.join(RECORDINGS_DIR, `${langKey}.wav`);
  const targetCallFile = path.join(RECORDINGS_DIR, `rec_${call.sid}.wav`);

  try {
    if (fs.existsSync(specificFile)) {
      fs.copyFileSync(specificFile, targetCallFile);
      console.log(`[SIMULATOR] Call ${call.sid}: Copied language-specific template (${langKey}.wav) to target.`);
    } else {
      // Generate a dynamic silent WAV file locally (10 seconds)
      const wavBuffer = generateSilenceWav(10);
      fs.writeFileSync(targetCallFile, wavBuffer);
      console.log(`[SIMULATOR] Call ${call.sid}: Language file ${langKey}.wav not found. Generated a local 10-second silent WAV file.`);
    }

    const appUrl = process.env.APP_URL || `http://localhost:5050`;
    const recordingUrl = `${appUrl}/recordings/rec_${call.sid}.wav`;

    const resolvedCallbackUrl = resolveUrl(call.recordingStatusCallback);
    console.log(`[SIMULATOR] Call ${call.sid}: Posting recording callback to Next.js: ${resolvedCallbackUrl}`);

    const form = new URLSearchParams();
    form.append("RecordingUrl", recordingUrl);
    form.append("RecordingDuration", "10");
    form.append("CallSid", call.sid);

    const response = await axios.post(resolvedCallbackUrl, form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    console.log(`[SIMULATOR] Call ${call.sid}: Callback successfully posted. Status: ${response.status}`);
  } catch (err: any) {
    console.error(`[SIMULATOR] Call ${call.sid}: Recording callback trigger failed:`, err.message);
  }
}

async function simulateCallLifecycle(callSid: string) {
  const call = activeSimCalls.get(callSid);
  if (!call) return;

  try {
    // 1. Ringing state
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if ((call.status as string) === "completed" || (call.status as string) === "failed") return;
    call.status = "ringing";
    console.log(`[SIMULATOR] Call ${callSid}: Status changed to ringing`);

    // 2. Connected state
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if ((call.status as string) === "completed" || (call.status as string) === "failed") return;
    call.status = "in-progress";
    console.log(`[SIMULATOR] Call ${callSid}: Status changed to in-progress`);

    // 3. Fetch TwiML from the application backend
    const resolvedUrl = resolveUrl(call.url);
    console.log(`[SIMULATOR] Call ${callSid}: Fetching TwiML from ${resolvedUrl}`);
    const twimlResponse = await axios.get(resolvedUrl);
    const twimlText = twimlResponse.data;
    console.log(`[SIMULATOR] Call ${callSid}: TwiML Response:\n${twimlText}`);

    // Parse TwiML to see what the simulated flow should execute
    const actions = await parseTwiML(twimlText);
    for (const action of actions) {
      if ((call.status as string) === "completed" || (call.status as string) === "failed") break;

      if (action.type === "say") {
        console.log(`[SIMULATOR] Call ${callSid} <Say lang="${action.language || "en-US"}">: "${action.text}"`);
        const wordCount = action.text ? action.text.split(/\s+/).length : 5;
        await new Promise((resolve) => setTimeout(resolve, Math.max(1500, wordCount * 350)));
      } else if (action.type === "record") {
        console.log(`[SIMULATOR] Call ${callSid} <Record>: Simulating customer speech recording...`);
        await new Promise((resolve) => setTimeout(resolve, 4000));
      } else if (action.type === "dial") {
        console.log(`[SIMULATOR] Call ${callSid} <Dial>: Simulating two-way bridge connection...`);
        if (action.recordingStatusCallback) {
          call.recordingStatusCallback = action.recordingStatusCallback;
          console.log(`[SIMULATOR] Call ${callSid}: Extracted Dial recordingStatusCallback: ${call.recordingStatusCallback}`);
        }
        // Simulate a 5-second call bridge dialogue session
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else if (action.type === "hangup") {
        console.log(`[SIMULATOR] Call ${callSid} <Hangup>: TwiML instructed hangup.`);
        break;
      }
    }

    // 4. Terminate Call and trigger recording callback
    if ((call.status as string) !== "completed") {
      call.status = "completed";
      console.log(`[SIMULATOR] Call ${callSid}: Status changed to completed`);
      await triggerRecordingCallback(call);
    }
  } catch (err: any) {
    console.error(`[SIMULATOR] Error during call simulation for ${callSid}:`, err.message);
    call.status = "failed";
  }
}

// Outgoing Caller ID / Validation Requests mock
app.post("/2010-04-01/Accounts/:accountSid/ValidationRequests.json", async (req, res) => {
  const { accountSid } = req.params;
  const { PhoneNumber, FriendlyName } = req.body;

  console.log(`[Twilio Mock] Received Validation Request for: ${PhoneNumber}`);

  if (PhoneNumber) {
    verifiedPhoneNumbers.add(PhoneNumber.trim());
    saveVerifiedNumbers();
  }

  return res.status(201).json({
    account_sid: accountSid,
    phone_number: PhoneNumber,
    friendly_name: FriendlyName || "Mock Verified Number",
    validation_code: "123456",
    call_sid: "CAmockverificationcall_" + Math.random().toString(36).substring(2, 10)
  });
});

// Outbound call placement
app.post("/2010-04-01/Accounts/:accountSid/Calls.json", async (req, res) => {
  const { accountSid } = req.params;
  const { To, From, Url, RecordingStatusCallback } = req.body;

  console.log(`[Twilio API] Call Request received: To=${To}, From=${From}, Url=${Url}`);

  if (!To || !From || !Url) {
    return res.status(400).json({
      code: 20001,
      message: "Missing required parameters: To, From, and Url are all required.",
      status: 400
    });
  }

  let callSid: string;

  if (TELEPHONY_MODE === "simulator") {
    callSid = "CA" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Extract language query parameter from Url
    let lang = "English";
    try {
      const parsed = new URL(Url);
      lang = parsed.searchParams.get("lang") || "English";
    } catch (e) {
      // Ignore
    }

    const newCall: SimCall = {
      sid: callSid,
      to: To,
      from: From,
      url: Url,
      recordingStatusCallback: RecordingStatusCallback || "",
      status: "queued",
      dateCreated: new Date().toISOString(),
      lang
    };
    
    activeSimCalls.set(callSid, newCall);

    // Run call simulation in background
    simulateCallLifecycle(callSid);

    return res.status(201).json({
      sid: callSid,
      status: "queued",
      to: To,
      from: From,
      direction: "outbound-api",
      price: null,
      price_unit: "USD",
      date_created: new Date().toUTCString(),
      date_updated: new Date().toUTCString(),
      parent_call_sid: null,
      duration: null,
      account_sid: accountSid,
      uri: `/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`
    });
  } else if (TELEPHONY_MODE === "telnyx") {
    try {
      const telnyxApiKey = process.env.TELNYX_API_KEY;
      const telnyxConnectionId = process.env.TELNYX_CONNECTION_ID;

      if (!telnyxApiKey || !telnyxConnectionId) {
        throw new Error("Missing TELNYX_API_KEY or TELNYX_CONNECTION_ID in twilio/.env");
      }

      let lang = "English";
      let leadId = "";
      try {
        const urlObj = new URL(Url);
        leadId = urlObj.searchParams.get("leadId") || "";
        lang = urlObj.searchParams.get("lang") || "English";
      } catch (e) {}

      const urlObj = new URL(Url);
      const nextJsPublicHost = urlObj.origin;

      const webhookUrl = `${nextJsPublicHost}/api/telnyx/webhook?leadId=${leadId}&lang=${lang}&originalUrl=${encodeURIComponent(Url)}&recordingCallback=${encodeURIComponent(RecordingStatusCallback || "")}`;

      // Override the From number if SIP_CALLER_ID is configured in the wrapper's .env file
      const callerId = process.env.SIP_CALLER_ID || From;

      console.log(`[Telnyx API] Placing outbound call via Telnyx to To=${To}, From=${callerId}`);
      console.log(`[Telnyx API] Webhook destination: ${webhookUrl}`);

      const telnyxRes = await axios.post("https://api.telnyx.com/v2/calls", {
        connection_id: telnyxConnectionId,
        to: To,
        from: callerId,
        webhook_url: webhookUrl
      }, {
        headers: {
          Authorization: `Bearer ${telnyxApiKey}`,
          "Content-Type": "application/json"
        }
      });

      const callControlId = telnyxRes.data.data.call_control_id;
      console.log(`[Telnyx API] Call successfully created. CallControlId=${callControlId}`);

      return res.status(201).json({
        sid: callControlId,
        status: "queued",
        to: To,
        from: callerId,
        direction: "outbound-api",
        price: null,
        price_unit: "USD",
        date_created: new Date().toUTCString(),
        date_updated: new Date().toUTCString(),
        parent_call_sid: null,
        duration: null,
        account_sid: accountSid,
        uri: `/2010-04-01/Accounts/${accountSid}/Calls/${callControlId}.json`
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.errors?.[0]?.title || err.message;
      console.error("[Twilio Mock] Outbound call placement failed via Telnyx:", errorMsg);
      return res.status(500).json({
        code: 21211,
        message: `Failed to route call through Telnyx: ${errorMsg}`,
        status: 500
      });
    }
  } else {
    // Asterisk Mode
    try {
      const { originateOutboundCall } = require("./client-ari");
      const cleanTo = To.replace(/[^\d+]/g, "");
      
      let lang = "English";
      let leadId = "";
      let userId = "";
      try {
        const urlObj = new URL(Url);
        leadId = urlObj.searchParams.get("leadId") || "";
        lang = urlObj.searchParams.get("lang") || "English";
        userId = urlObj.searchParams.get("userId") || "";
      } catch (e) {}

      // Override the From number if SIP_CALLER_ID is configured in the wrapper's .env file
      const callerId = process.env.SIP_CALLER_ID || From;
      const result = await originateOutboundCall(cleanTo, callerId, leadId, lang, userId);

      return res.status(201).json({
        sid: result.callSid,
        status: "queued",
        to: To,
        from: callerId,
        direction: "outbound-api",
        price: null,
        price_unit: "USD",
        date_created: new Date().toUTCString(),
        date_updated: new Date().toUTCString(),
        parent_call_sid: null,
        duration: null,
        account_sid: accountSid,
        uri: `/2010-04-01/Accounts/${accountSid}/Calls/${result.callSid}.json`
      });
    } catch (err: any) {
      console.error("[Twilio Mock] Outbound call placement failed:", err.message);
      return res.status(500).json({
        code: 21211,
        message: err.message || "Failed to route call through Asterisk.",
        status: 500
      });
    }
  }
});

// GET call status
app.get("/2010-04-01/Accounts/:accountSid/Calls/:callSid.json", (req, res) => {
  const { callSid } = req.params;
  
  if (TELEPHONY_MODE === "simulator") {
    const call = activeSimCalls.get(callSid);
    if (!call) {
      return res.status(404).json({ message: "Call not found", status: 404 });
    }
    return res.status(200).json({
      sid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from
    });
  } else if (TELEPHONY_MODE === "telnyx") {
    const session = activeTelnyxCalls.get(callSid);
    return res.status(200).json({
      sid: callSid,
      status: session ? "in-progress" : "completed",
      to: "",
      from: ""
    });
  } else {
    // Standard completed mock response for Asterisk fallback
    return res.status(200).json({
      sid: callSid,
      status: "completed"
    });
  }
});

// Modify call (Hangup)
app.post("/2010-04-01/Accounts/:accountSid/Calls/:callSid.json", async (req, res) => {
  const { callSid } = req.params;
  const { Status } = req.body;

  console.log(`[Twilio API] Call Modification received: CallSid=${callSid}, Status=${Status}`);

  if (TELEPHONY_MODE === "simulator") {
    const call = activeSimCalls.get(callSid);
    if (call && Status === "completed" && call.status !== "completed") {
      call.status = "completed";
      console.log(`[SIMULATOR] Call ${callSid}: Programmatically completed by backend hangup request.`);
      triggerRecordingCallback(call);
    }
    return res.status(200).json({
      sid: callSid,
      status: Status || "completed"
    });
  } else if (TELEPHONY_MODE === "telnyx") {
    if (Status === "completed") {
      try {
        const telnyxApiKey = process.env.TELNYX_API_KEY;
        await axios.post(`https://api.telnyx.com/v2/calls/${callSid}/actions/hangup`, {}, {
          headers: { Authorization: `Bearer ${telnyxApiKey}` }
        });
        console.log(`[Telnyx API] Programmatic hangup for ${callSid}`);
      } catch (err: any) {
        console.warn(`[Telnyx API] Programmatic hangup failed: ${err.message}`);
      }
    }
    return res.status(200).json({
      sid: callSid,
      status: Status || "completed"
    });
  } else {
    // Asterisk Mode Hangup
    if (Status === "completed") {
      try {
        const axios = require("axios");
        const ARI_HTTP_BASE = `http://${process.env.ASTERISK_HOST || "asterisk"}:${process.env.ASTERISK_PORT || "8088"}/ari`;
        const ARI_USER = process.env.ASTERISK_USER || "bpo_ari";
        const ARI_PASS = process.env.ASTERISK_PASS || "bpo_ari_secret";
        
        await axios.delete(`${ARI_HTTP_BASE}/channels/${callSid}`, {
          auth: { username: ARI_USER, password: ARI_PASS }
        });
        console.log(`[Twilio Mock] Channel ${callSid} hung up programmatically.`);
      } catch (err: any) {
        console.warn(`[Twilio Mock] Channel hangup warning: ${err.message}`);
      }
    }
    return res.status(200).json({
      sid: callSid,
      status: Status || "completed"
    });
  }
});

// Telnyx Webhook Route (proxied from Next.js)
app.post("/telnyx/webhook", async (req, res) => {
  const { event_type, data } = req.body;
  const { leadId, lang, originalUrl, recordingCallback } = req.query;

  const callControlId = data?.payload?.call_control_id;
  if (!callControlId) {
    return res.status(200).send("OK");
  }

  const telnyxApiKey = process.env.TELNYX_API_KEY;

  console.log(`[Telnyx Webhook] Event: ${event_type}, CallControlId: ${callControlId}`);

  try {
    if (event_type === "call.answered") {
      // 1. Fetch TwiML from Next.js
      const twimlUrl = originalUrl as string;
      console.log(`[Telnyx] Call answered. Fetching TwiML from: ${twimlUrl}`);
      
      const twimlRes = await axios.get(twimlUrl);
      const twimlText = twimlRes.data;
      console.log(`[Telnyx] TwiML content:\n${twimlText}`);

      // 2. Parse TwiML
      const actions = await parseTwiML(twimlText);
      console.log(`[Telnyx] Parsed actions:`, actions);

      // 3. Save call session
      activeTelnyxCalls.set(callControlId, {
        actions,
        currentActionIndex: 0,
        recordingCallback: recordingCallback as string,
        leadId: leadId as string,
        lang: lang as string,
        originalUrl: twimlUrl
      });

      // 4. Execute first action
      if (actions.length > 0) {
        await executeTelnyxAction(callControlId, actions[0]);
      } else {
        // Hangup if no actions
        await axios.post(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {}, {
          headers: { Authorization: `Bearer ${telnyxApiKey}` }
        });
      }
    } else if (event_type === "call.speak.ended") {
      const session = activeTelnyxCalls.get(callControlId);
      if (session) {
        session.currentActionIndex++;
        if (session.currentActionIndex < session.actions.length) {
          const nextAction = session.actions[session.currentActionIndex];
          await executeTelnyxAction(callControlId, nextAction);
        } else {
          // If no more actions, hangup
          console.log(`[Telnyx] All actions completed for call ${callControlId}. Hanging up...`);
          await axios.post(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {}, {
            headers: { Authorization: `Bearer ${telnyxApiKey}` }
          });
        }
      }
    } else if (event_type === "call.recording.saved") {
      const session = activeTelnyxCalls.get(callControlId);
      if (session) {
        const recordingUrl = data.payload.recording_urls?.wav || data.payload.recording_urls?.mp3;
        console.log(`[Telnyx] Recording saved for call ${callControlId}. URL: ${recordingUrl}`);

        if (recordingUrl && session.recordingCallback) {
          console.log(`[Telnyx] Forwarding recording to Next.js callback: ${session.recordingCallback}`);
          
          // Next.js expects: CallSid, RecordingUrl, RecordingDuration
          const params = new URLSearchParams();
          params.append("CallSid", callControlId);
          params.append("RecordingUrl", recordingUrl);
          params.append("RecordingDuration", "10"); // default fallback duration
          
          await axios.post(session.recordingCallback, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
          });
          console.log(`[Telnyx] Successfully posted recording callback to Next.js.`);
        }
        activeTelnyxCalls.delete(callControlId);
      }
    } else if (event_type === "call.hangup" || event_type === "call.failed") {
      console.log(`[Telnyx] Call disconnected or failed: ${callControlId}`);
      activeTelnyxCalls.delete(callControlId);
    }
  } catch (err: any) {
    console.error(`[Telnyx Webhook Error]`, err.message);
  }

  return res.status(200).send("OK");
});

async function executeTelnyxAction(callControlId: string, action: any) {
  const telnyxApiKey = process.env.TELNYX_API_KEY;
  
  if (action.type === "say") {
    console.log(`[Telnyx] Executing speak action: "${action.text}"`);
    // Map voices if needed. Telnyx supports standard female/male or Amazon Polly
    const telnyxVoice = action.voice?.includes("Aditi") ? "Aditi" : "female";
    
    await axios.post(`https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`, {
      payload: action.text,
      voice: telnyxVoice,
      language: action.language || "en-US",
      engine: "google" // Use standard or premium engine
    }, {
      headers: { Authorization: `Bearer ${telnyxApiKey}` }
    });
  } else if (action.type === "record") {
    console.log(`[Telnyx] Executing record action.`);
    await axios.post(`https://api.telnyx.com/v2/calls/${callControlId}/actions/record_start`, {
      format: "wav",
      channels: "single",
      time_limit: action.maxLength || 60,
      play_beep: action.playBeep !== false,
      silence_detect: true,
      silence_timeout: 5000
    }, {
      headers: { Authorization: `Bearer ${telnyxApiKey}` }
    });
  } else if (action.type === "hangup") {
    console.log(`[Telnyx] Executing hangup action.`);
    await axios.post(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {}, {
      headers: { Authorization: `Bearer ${telnyxApiKey}` }
    });
  }
}

// Start Server
app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Self-Hosted Twilio API Mock Server [Mode: ${TELEPHONY_MODE}]`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
  
  if (TELEPHONY_MODE === "simulator") {
    console.log(`[SIMULATOR] Standalone simulator initialized. Offline fallback WAV builder active.`);
  } else {
    try {
      const { startARIClient } = require("./client-ari");
      startARIClient();
    } catch (e) {
      console.error("[Twilio Mock] Failed to start Asterisk connection:", e);
    }
  }
});
