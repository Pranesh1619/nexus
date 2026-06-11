import { cookies } from "next/headers";
import React from "react";
import { getCallLogs } from "./actions";
import { getActiveSipConfig } from "./new/actions";
import { prisma } from "@/lib/db";
import CallsWorkspace from "./CallsWorkspace";

export const dynamic = "force-dynamic";

export default async function CallLogsPage({
  searchParams
}: {
  searchParams: Promise<{ leadId?: string; tab?: string }>
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const leadId = (resolvedSearchParams as any)?.leadId;
  const tab = (resolvedSearchParams as any)?.tab;

  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const userRole = cookieStore.get("user_role")?.value;

  let logs: any[] = [];
  let leads: any[] = [];
  let sipConfig: any = null;
  let dbError = false;

  try {
    logs = await getCallLogs(userRole === "SALES" ? userId : undefined);
    leads = await prisma.lead.findMany({
      orderBy: { name: "asc" }
    });
    sipConfig = await getActiveSipConfig();
  } catch (err) {
    console.error("Database connection failure in CallLogsPage:", err);
    dbError = true;
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Call Center Workspace</h2>
          <p className="text-secondary small">Dial customer phone numbers via SIP trunks and manage interactive transcripts in a single screen.</p>
        </div>
      </div>

      {dbError && (
        <div className="alert alert-danger d-flex align-items-start gap-3 p-4 mb-4 shadow-sm" role="alert" style={{ borderRadius: "12px" }}>
          <i className="bi bi-exclamation-triangle-fill fs-4 text-danger flex-shrink-0"></i>
          <div>
            <h6 className="alert-heading fw-bold mb-1">Database Connection Unreachable</h6>
            <p className="small mb-2 text-secondary" style={{ lineHeight: "1.5" }}>
              The application is unable to connect to your PostgreSQL database host on Supabase.
            </p>
            <hr className="my-2 border-danger border-opacity-20" />
            <ul className="small mb-0 text-muted ps-3">
              <li>Check if your project is **Paused** in the <a href="https://supabase.com" target="_blank" rel="noreferrer" className="alert-link text-decoration-underline text-danger fw-semibold">Supabase Dashboard</a> (click "Restore project").</li>
              <li>Verify that your local internet or firewall doesn't block outgoing database ports.</li>
            </ul>
          </div>
        </div>
      )}

      {!dbError && (
        <CallsWorkspace 
          initialLogs={logs} 
          leads={leads} 
          sipConfig={sipConfig} 
          initialLeadId={leadId}
          initialTab={tab}
        />
      )}
    </div>
  );
}
