import { cookies } from "next/headers";
import React from "react";
import { getLeads } from "./actions";
import LeadList from "./LeadList";
import StatusModal from "@/components/StatusModal";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const userRole = cookieStore.get("user_role")?.value;

  let leads: any[] = [];
  let dbError = false;
  try {
    leads = await getLeads(userRole === "SALES" ? userId : undefined);
  } catch (err) {
    console.error("Database connection failure in LeadsPage:", err);
    dbError = true;
  }

  return (
    <div className="page-container">
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
      <LeadList leads={leads} />

      <StatusModal 
        id="successModal" 
        type="success" 
        title="Lead Added!" 
        message="The new lead has been successfully added to your database." 
      />
    </div>
  );
}
