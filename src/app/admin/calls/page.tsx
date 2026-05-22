import { cookies } from "next/headers";
import React from "react";
import { getCallLogs } from "./actions";
import Link from "next/link";
import CallList from "./CallList";

export const dynamic = "force-dynamic";

export default async function CallLogsPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const userRole = cookieStore.get("user_role")?.value;

  let logs: any[] = [];
  let dbError = false;
  try {
    logs = await getCallLogs(userRole === "SALES" ? userId : undefined);
  } catch (err) {
    console.error("Database connection failure in CallLogsPage:", err);
    dbError = true;
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Call Logs</h2>
          <p className="text-secondary small">History of all inbound and outbound calls.</p>
        </div>
        <Link href="/admin/leads" className="btn btn-primary">
          <i className="bi bi-telephone-plus me-2"></i> New Call
        </Link>
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

      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card text-center p-3 shadow-sm border-0">
            <div className="text-secondary x-small fw-bold mb-1 uppercase">Total Calls</div>
            <div className="h4 fw-bold mb-0">{logs.length}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center p-3 shadow-sm border-0 border-start border-success border-4">
            <div className="text-secondary x-small fw-bold mb-1 uppercase">Connected</div>
            <div className="h4 fw-bold mb-0 text-success">{logs.filter(l => l.status === 'CONNECTED').length}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center p-3 shadow-sm border-0 border-start border-danger border-4">
            <div className="text-secondary x-small fw-bold mb-1 uppercase">Missed</div>
            <div className="h4 fw-bold mb-0 text-danger">{logs.filter(l => l.status === 'MISSED').length}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center p-3 shadow-sm border-0 border-start border-warning border-4">
            <div className="text-secondary x-small fw-bold mb-1 uppercase">Avg. Duration</div>
            <div className="h4 fw-bold mb-0 text-warning">04:12</div>
          </div>
        </div>
      </div>

      <CallList logs={logs} />
    </div>
  );
}
