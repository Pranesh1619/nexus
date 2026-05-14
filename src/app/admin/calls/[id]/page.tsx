import React from "react";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CallProgression from "./CallProgression";

export const dynamic = "force-dynamic";

export default async function CallViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await prisma.callLog.findUnique({
    where: { id },
    include: { lead: true, user: true },
  });

  if (!call) return <div className="alert alert-danger">Call not found.</div>;

  const currentStageIndex = [
    "New Lead", "Attempted Contact", "Connected", "Enquiry", "Engaged", 
    "Interested", "Desire", "Qualified", "Follow-up Needed", "Closed"
  ].indexOf(call.stage);
  
  const dynamicOverallScore = Math.min(100, Math.floor(50 + (currentStageIndex / 9) * 40 + (call.aiScore || 0) / 10));

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/calls" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Calls</span>
        </Link>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3">
          <h3 className="fw-bold mb-0">{call.lead.name} Call Analysis</h3>
          <div className="d-flex align-items-center gap-2">
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
        {/* <p className="text-secondary x-small mt-1">Comprehensive AI review and lead progression tracking for this record.</p> */}
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
                <i className="bi bi-card-text text-secondary"></i> Interactive Transcript & Translation
              </h5>

              {call.detectedVoiceLanguage && (
                <div className="d-flex flex-wrap gap-3 mb-4 p-3 bg-light rounded-3 border">
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

              <div className="transcript-wrapper pe-2" style={{ maxHeight: "450px", overflowY: "auto" }}>
                {call.translatedText || call.transcript ? (
                  <div className="bg-light p-4 rounded-4 border shadow-sm mb-3">
                    <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                      <span className="fw-bold small text-primary">Call Audio Transcript / Translated Text</span>
                      <span className="x-small text-secondary">{new Date(call.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="small mb-0 text-dark" style={{ lineHeight: "1.6" }}>
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
            </div>
          </div>
        </div>

        {/* Right Column: Lead Snapshot & Recording */}
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
    </div>
  );
}
