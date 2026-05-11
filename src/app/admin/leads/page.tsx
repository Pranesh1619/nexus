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

  const leads = await getLeads(userRole === "SALES" ? userId : undefined);
  return (
    <div className="page-container">
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
