import { getUsers, getLeadsForSalesFloor } from "./actions";
import Link from "next/link";
import SalesFloorWorkspace from "./SalesFloorWorkspace";

export const dynamic = "force-dynamic";

export default async function SalesManagement() {
  // 1. Fetch agents (with auto-provisioning) and leads
  const agents = await getUsers();
  const leads = await getLeadsForSalesFloor();

  return (
    <div className="page-container animate-fade">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Interactive Sales Floor</h2>
          <p className="text-secondary small mb-0">Assign leads to sales representatives visually via drag-and-drop.</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/users" className="btn btn-outline-secondary px-3 py-2 small fw-bold">
            <i className="bi bi-people me-1"></i> Manage Users
          </Link>
          <Link href="/admin/sales/new" className="btn btn-primary px-4 py-2 small fw-bold shadow-sm">
            <i className="bi bi-person-plus me-1"></i> Add Team Member
          </Link>
        </div>
      </div>

      {/* Interactive DND Workspace Component */}
      <SalesFloorWorkspace agents={agents} leads={leads} />
    </div>
  );
}
