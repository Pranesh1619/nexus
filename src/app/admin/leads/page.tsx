import React from "react";
import { getLeads } from "./actions";
import Link from "next/link";
import LeadList from "./LeadList";
import StatusModal from "@/components/StatusModal";

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Leads Management</h2>
          <p className="text-secondary small">Track and manage your potential customers.</p>
        </div>
        <Link href="/admin/leads/new" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i> Add Lead
        </Link>
      </div>

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
