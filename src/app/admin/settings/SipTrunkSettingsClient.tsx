"use client";

import React, { useState, useTransition } from "react";
import { saveSipTrunkConfig } from "./actions";

type SipConfigType = {
  id: string;
  domain: string;
  webSocketUrl: string;
  username: string;
  password?: string;
  callerId: string;
  codec: string;
  isActive: boolean;
  mockTwilioUrl?: string | null;
  telephonyProvider?: string;
  plivoAuthId?: string | null;
  plivoAuthToken?: string | null;
  plivoAppSid?: string | null;
};

interface SipTrunkSettingsClientProps {
  initialConfig: SipConfigType;
}

export default function SipTrunkSettingsClient({ initialConfig }: SipTrunkSettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<SipConfigType>(initialConfig);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plivoAuthToken, setPlivoAuthToken] = useState("");
  const [showPlivoToken, setShowPlivoToken] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleToggleActive = () => {
    setConfig(prev => ({
      ...prev,
      isActive: !prev.isActive
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await saveSipTrunkConfig({
        domain: config.domain,
        webSocketUrl: config.webSocketUrl,
        username: config.username,
        password: password || undefined, // Only pass password if changed
        callerId: config.callerId,
        codec: config.codec,
        isActive: config.isActive,
        mockTwilioUrl: config.mockTwilioUrl,
        telephonyProvider: config.telephonyProvider || "TWILIO",
        plivoAuthId: config.plivoAuthId,
        plivoAuthToken: plivoAuthToken || undefined,
        plivoAppSid: config.plivoAppSid
      });

      if (res.success) {
        setMessage({ type: "success", text: "Telephony & Trunk configuration saved successfully!" });
        setPassword(""); // Clear password field after save
        setPlivoAuthToken(""); // Clear Plivo token field after save
        if (res.config) {
          setConfig({
            ...res.config,
            password: "", // Don't keep password plaintext in local state
            plivoAuthToken: "" // Don't keep token plaintext in local state
          });
        }
      } else {
        setMessage({ type: "danger", text: res.error || "Failed to update configuration" });
      }
    });
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h6 className="fw-bold mb-1 small uppercase text-secondary">Telephony & Trunk Integration</h6>
            <p className="text-secondary x-small mb-0">Configure your Session Initiation Protocol (SIP) trunk and communications provider for voice calls.</p>
          </div>
          <div className="form-check form-switch p-0 m-0 d-flex align-items-center">
            <span className="small text-secondary fw-semibold me-2">{config.isActive ? "Enabled" : "Disabled"}</span>
            <input
              className="form-check-input ms-0 cursor-pointer"
              type="checkbox"
              role="switch"
              checked={config.isActive}
              onChange={handleToggleActive}
              style={{ width: "40px", height: "20px" }}
            />
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type} py-2 px-3 small border-0 d-flex align-items-center gap-2 mb-4`} style={{ borderRadius: "10px" }}>
            <i className={`bi ${message.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}`}></i>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="row g-3">
          
          {/* Active Provider Cards */}
          <div className="col-12 mb-3">
            <label className="form-label x-small fw-bold text-secondary text-uppercase mb-2">Active Telephony Provider</label>
            <div className="row g-3">
              <div className="col-md-6">
                <div 
                  className={`card cursor-pointer border-2 h-100 ${config.telephonyProvider === "TWILIO" ? "border-primary bg-primary bg-opacity-5" : "border-light bg-light"}`}
                  onClick={() => setConfig(prev => ({ ...prev, telephonyProvider: "TWILIO" }))}
                  style={{ borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div className="card-body p-3 d-flex align-items-center gap-3">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center ${config.telephonyProvider === "TWILIO" ? "bg-primary text-white" : "bg-secondary bg-opacity-10 text-secondary"}`} style={{ width: "40px", height: "40px" }}>
                      <i className="bi bi-telephone-fill"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0 small">Twilio Integration</h6>
                      <p className="text-secondary x-small mb-0 text-muted">Use Twilio for programmable voice calling & WebRTC.</p>
                    </div>
                    <div className="ms-auto">
                      <input
                        type="radio"
                        name="telephonyProvider"
                        value="TWILIO"
                        checked={config.telephonyProvider === "TWILIO"}
                        onChange={handleInputChange}
                        className="form-check-input"
                        style={{ pointerEvents: "none" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div 
                  className={`card cursor-pointer border-2 h-100 ${config.telephonyProvider === "PLIVO" ? "border-primary bg-primary bg-opacity-5" : "border-light bg-light"}`}
                  onClick={() => setConfig(prev => ({ ...prev, telephonyProvider: "PLIVO" }))}
                  style={{ borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div className="card-body p-3 d-flex align-items-center gap-3">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center ${config.telephonyProvider === "PLIVO" ? "bg-warning text-dark" : "bg-secondary bg-opacity-10 text-secondary"}`} style={{ width: "40px", height: "40px" }}>
                      <i className="bi bi-lightning-charge-fill"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0 small">Plivo Integration</h6>
                      <p className="text-secondary x-small mb-0 text-muted">Use Plivo (up to 85% cheaper call rates in India).</p>
                    </div>
                    <div className="ms-auto">
                      <input
                        type="radio"
                        name="telephonyProvider"
                        value="PLIVO"
                        checked={config.telephonyProvider === "PLIVO"}
                        onChange={handleInputChange}
                        className="form-check-input"
                        style={{ pointerEvents: "none" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plivo Settings Section */}
          {config.telephonyProvider === "PLIVO" && (
            <div className="col-12 p-3 bg-light rounded-3 border mb-3 row g-3 mx-0">
              <h6 className="fw-bold mb-0 text-dark small d-flex align-items-center gap-2">
                <i className="bi bi-key-fill text-warning"></i>
                Plivo API Credentials
              </h6>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Plivo Auth ID</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white text-secondary border-0"><i className="bi bi-person-badge"></i></span>
                  <input
                    type="text"
                    name="plivoAuthId"
                    value={config.plivoAuthId || ""}
                    onChange={handleInputChange}
                    className="form-control border-0 bg-white"
                    placeholder="Enter Plivo Auth ID"
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Plivo Auth Token</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white text-secondary border-0"><i className="bi bi-shield-lock"></i></span>
                  <input
                    type={showPlivoToken ? "text" : "password"}
                    value={plivoAuthToken}
                    onChange={(e) => setPlivoAuthToken(e.target.value)}
                    className="form-control border-0 bg-white"
                    placeholder={initialConfig.plivoAuthId ? "•••••••• (unchanged)" : "Enter Plivo Auth Token"}
                  />
                  <button
                    type="button"
                    className="btn btn-white border-0"
                    onClick={() => setShowPlivoToken(!showPlivoToken)}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showPlivoToken ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
              </div>
              <div className="col-12 mt-2">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Plivo Application SID</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white text-secondary border-0"><i className="bi bi-cpu"></i></span>
                  <input
                    type="text"
                    name="plivoAppSid"
                    value={config.plivoAppSid || ""}
                    onChange={handleInputChange}
                    className="form-control border-0 bg-white"
                    placeholder="Enter Plivo Application SID"
                  />
                </div>
                <div className="x-small text-muted mt-1">Found in Plivo Console &gt; Voice &gt; Applications. Used to route call handling flow.</div>
              </div>
            </div>
          )}

          {/* SIP Trunk Configurations */}
          <div className="col-md-6">
            <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">SIP Server Domain</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-secondary border-0"><i className="bi bi-globe"></i></span>
              <input
                type="text"
                name="domain"
                value={config.domain}
                onChange={handleInputChange}
                className="form-control border-0 bg-light"
                placeholder="phone.provider.com or sip.twilio.com"
                required
              />
            </div>
            <div className="x-small text-muted mt-1">IP address or hostname of your SIP registration registrar/gateway.</div>
          </div>

          <div className="col-md-6">
            <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">WebRTC WebSocket Gateway URL</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-secondary border-0"><i className="bi bi-link-45deg"></i></span>
              <input
                type="text"
                name="webSocketUrl"
                value={config.webSocketUrl}
                onChange={handleInputChange}
                className="form-control border-0 bg-light"
                placeholder="wss://phone.provider.com/ws"
                required
              />
            </div>
            <div className="x-small text-muted mt-1">Secure WebSocket (WSS) link for the web-based softphone client.</div>
          </div>

          <div className="col-md-6">
            <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">SIP Auth Username</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-secondary border-0"><i className="bi bi-person"></i></span>
              <input
                type="text"
                name="username"
                value={config.username}
                onChange={handleInputChange}
                className="form-control border-0 bg-light"
                placeholder="e.g. extension_101 or trunk_user"
                required
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">SIP Auth Password</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-secondary border-0"><i className="bi bi-shield-lock"></i></span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control border-0 bg-light"
                placeholder={initialConfig.username ? "•••••••• (unchanged)" : "Enter trunk password"}
              />
              <button
                type="button"
                className="btn btn-light border-0"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Outbound Caller ID (DID)</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-secondary border-0"><i className="bi bi-telephone"></i></span>
              <input
                type="text"
                name="callerId"
                value={config.callerId}
                onChange={handleInputChange}
                className="form-control border-0 bg-light"
                placeholder="e.g. +14155552671"
                required
              />
            </div>
            <div className="x-small text-muted mt-1">Verified phone number display for outbound calls.</div>
          </div>

          <div className="col-md-6">
            <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Preferred Voice Codec</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-secondary border-0"><i className="bi bi-waveform"></i></span>
              <select
                name="codec"
                value={config.codec}
                onChange={handleInputChange}
                className="form-select border-0 bg-light fw-semibold"
                style={{ fontSize: "13px" }}
              >
                <option value="OPUS">OPUS (High Definition Voice)</option>
                <option value="G711_ULAW">G.711 μ-law (PCMU - North America)</option>
                <option value="G711_ALAW">G.711 a-law (PCMA - Europe/International)</option>
              </select>
            </div>
          </div>

          {/* Self-hosted Mock URL (Only for Twilio) */}
          {config.telephonyProvider === "TWILIO" && (
            <div className="col-12">
              <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Self-hosted Mock Twilio Server URL (Optional)</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light text-secondary border-0"><i className="bi bi-server"></i></span>
                <input
                  type="text"
                  name="mockTwilioUrl"
                  value={config.mockTwilioUrl || ""}
                  onChange={handleInputChange}
                  className="form-control border-0 bg-light"
                  placeholder="e.g. http://localhost:5050"
                />
              </div>
              <div className="x-small text-muted mt-1">Specify a custom endpoint for your self-hosted Twilio simulator server (leaves real Twilio active if blank).</div>
            </div>
          )}

          <div className="col-12 mt-4 pt-2 border-top d-flex gap-2 justify-content-end">
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
              style={{ borderRadius: "10px" }}
            >
              {isPending ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-check"></i>
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


