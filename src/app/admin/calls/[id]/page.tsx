import React from "react";
import { prisma } from "@/lib/db";
import CallDetailsClient from "./CallDetailsClient";

export const dynamic = "force-dynamic";

export default async function CallViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let call = null;
  let dbError = false;

  try {
    call = await prisma.callLog.findUnique({
      where: { id },
      include: { lead: true, user: true },
    });

    if (call && call.jobId) {
      // Find all database entries with the same Twilio Job ID
      const logs = await prisma.callLog.findMany({
        where: { jobId: call.jobId },
        include: { lead: true, user: true },
        orderBy: { createdAt: "desc" }
      });

      if (logs.length > 1) {
        // Find which one is the real transcription and which one is the placeholder
        const realLog = logs.find(l => l.transcript && !l.transcript.includes("Recording is being processed by Twilio"));
        const placeholderLog = logs.find(l => l.transcript && l.transcript.includes("Recording is being processed by Twilio"));

        if (realLog && placeholderLog) {
          // Merge user options from placeholder into the real log
          const updatedRealLog = await prisma.callLog.update({
            where: { id: realLog.id },
            data: {
              stage: placeholderLog.stage || realLog.stage,
              duration: placeholderLog.duration || realLog.duration,
              userId: placeholderLog.userId || realLog.userId,
              status: placeholderLog.status || realLog.status,
            },
            include: { lead: true, user: true }
          });

          // Delete the temporary placeholder
          await prisma.callLog.delete({
            where: { id: placeholderLog.id }
          });

          call = updatedRealLog;
        }
      }
    }
  } catch (err) {
    console.error("Database connection failure in CallViewPage:", err);
    dbError = true;
  }

  if (dbError) {
    return (
      <div className="page-container">
        <div className="alert alert-danger d-flex align-items-start gap-3 p-4 shadow-sm" role="alert" style={{ borderRadius: "12px" }}>
          <i className="bi bi-exclamation-triangle-fill fs-4 text-danger flex-shrink-0"></i>
          <div>
            <h6 className="alert-heading fw-bold mb-1">Database Connection Unreachable</h6>
            <p className="small mb-2 text-secondary" style={{ lineHeight: "1.5" }}>
              Unable to load call details because the PostgreSQL database is unreachable.
            </p>
            <hr className="my-2 border-danger border-opacity-20" />
            <ul className="small mb-0 text-muted ps-3">
              <li>Check if your project is **Paused** in the <a href="https://supabase.com" target="_blank" rel="noreferrer" className="alert-link text-decoration-underline text-danger fw-semibold">Supabase Dashboard</a> (click "Restore project").</li>
              <li>Verify that your local internet or firewall doesn't block outgoing database ports.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!call) return <div className="page-container"><div className="alert alert-danger">Call not found.</div></div>;

  const isPlaceholder = !!(call.transcript && call.transcript.includes("Recording is being processed by Twilio"));

  const currentStageIndex = [
    "New Lead", "Attempted Contact", "Connected", "Enquiry", "Engaged", 
    "Interested", "Desire", "Qualified", "Follow-up Needed", "Closed"
  ].indexOf(call.stage);
  
  const dynamicOverallScore = Math.min(100, Math.floor(50 + (currentStageIndex / 9) * 40 + (call.aiScore || 0) / 10));

  let parsedTurns: any[] | null = null;
  if (call.transcript) {
    try {
      const parsed = JSON.parse(call.transcript);
      if (Array.isArray(parsed)) {
        parsedTurns = parsed;
      }
    } catch (e) {
      // Fallback to text
    }
  }

  return (
    <CallDetailsClient
      call={call}
      dynamicOverallScore={dynamicOverallScore}
      parsedTurns={parsedTurns}
      isPlaceholder={isPlaceholder}
      id={id}
    />
  );
}
