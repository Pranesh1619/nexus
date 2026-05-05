import { getUsers } from "./actions";
import Link from "next/link";
import SalesListClient from "./SalesListClient";

export default async function SalesManagement() {
  const users = await getUsers();

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Sales Team Management</h3>
          <p className="text-secondary x-small">Configure sales agent access and view performance oversight.</p>
        </div>
        <Link href="/admin/sales/new" className="btn btn-primary px-4 py-2 small fw-bold shadow-sm">
          <i className="bi bi-person-plus me-2"></i> Add Team Member
        </Link>
      </div>

      <SalesListClient users={users} />
    </div>
  );
}
