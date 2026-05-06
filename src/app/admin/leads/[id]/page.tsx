import { getLeadById } from "../actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllUsers } from "../../users/actions";
import LeadAssignWrapper from "./LeadAssignWrapper";
import LeadTimelineChart from "./LeadTimelineChart";

export const dynamic = "force-dynamic";

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  // Fetch all registered users to select assignments
  const users = await getAllUsers();
  const salesAgents = users.filter((u) => u.role === "SALES" || u.role === "ADMIN");

  // Determine current assigned agent name
  const currentAgent = users.find((u) => u.id === lead.assignedTo);
  const assignedAgentName = currentAgent ? currentAgent.name : "Unassigned";

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/admin/leads" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
            <i className="bi bi-arrow-left me-1 x-small"></i> <span className="x-small fw-bold uppercase">Back to Leads</span>
          </Link>
          <h3 className="fw-bold mb-1">{lead.name} Profile</h3>
        </div>
        <div className="d-flex gap-2">
          <Link href={`/admin/leads/${id}/edit`} className="btn btn-light border px-3 py-1 small">
            <i className="bi bi-pencil-square me-2 text-info"></i>Edit
          </Link>
          <LeadAssignWrapper leadId={id} currentAssignedTo={lead.assignedTo} agents={salesAgents} />
        </div>
      </div>

      {/* High-Density Form View Lead Information */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
            <h6 className="fw-bold mb-0">Record Overview</h6>
          </div>
          
          <div className="row g-4">
            <div className="col-md-4 col-lg-3">
              <div className="p-2 px-3 bg-light rounded-3">
                <label className="form-label mb-1">Full Name</label>
                <div className="fw-bold text-dark small">{lead.name}</div>
              </div>
            </div>
            <div className="col-md-4 col-lg-3">
              <div className="p-2 px-3 bg-light rounded-3">
                <label className="form-label mb-1">Phone Number</label>
                <div className="fw-bold text-dark small">{lead.phone}</div>
              </div>
            </div>
            <div className="col-md-4 col-lg-3">
              <div className="p-2 px-3 bg-light rounded-3">
                <label className="form-label mb-1">Email Address</label>
                <div className="fw-bold text-dark small">{lead.email || '—'}</div>
              </div>
            </div>
            <div className="col-md-4 col-lg-3">
              <div className="p-2 px-3 bg-light rounded-3">
                <label className="form-label mb-1">Company Name</label>
                <div className="fw-bold text-dark small">{lead.company || '—'}</div>
              </div>
            </div>
            <div className="col-md-4 col-lg-3">
              <div className="p-2 px-3 bg-light rounded-3">
                <label className="form-label mb-1">Assigned Agent</label>
                <div className="fw-bold text-primary small d-flex align-items-center gap-1.5">
                  <i className="bi bi-person-badge-fill"></i>
                  <span>{assignedAgentName}</span>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-3">
              <div className="p-2 px-3 bg-light rounded-3">
                <label className="form-label mb-1">Lead Source</label>
                <div className="fw-bold text-dark small">{lead.source}</div>
              </div>
            </div>
            <div className="col-md-4 col-lg-3">
              <div className="p-2 px-3 bg-light rounded-3">
                <label className="form-label mb-1">Created Date</label>
                <div className="fw-bold text-dark small">{new Date(lead.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 d-flex justify-content-end">
            <Link href={`/admin/calls/new?leadId=${id}`} className="btn btn-success btn-sm px-4 py-2 shadow-sm fw-bold">
              <i className="bi bi-telephone-plus me-2"></i> Start Call
            </Link>
          </div>
        </div>
      </div>


      {/* Recharts Analytics Area Trend Graph */}
      {lead.calls && lead.calls.length > 0 && (
        <LeadTimelineChart calls={lead.calls} />
      )}

      {/* Full Width Interaction History */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <h6 className="fw-bold mb-4">Interaction History</h6>
          
          {lead.calls && lead.calls.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="x-small text-secondary px-3 py-2">Date</th>
                    <th className="x-small text-secondary py-2">Status</th>
                    <th className="x-small text-secondary py-2">Duration</th>
                    <th className="x-small text-secondary py-2">Stage</th>
                    <th className="x-small text-secondary text-end px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lead.calls.map((call) => (
                    <tr key={call.id}>
                      <td className="small px-3">{new Date(call.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${call.status === 'CONNECTED' ? 'bg-success' : 'bg-danger'} bg-opacity-10 text-${call.status === 'CONNECTED' ? 'success' : 'danger'} rounded-pill px-2 py-1 x-small fw-normal`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="small">{call.duration}s</td>
                      <td className="small fw-bold text-primary">{call.stage}</td>
                      <td className="text-end px-3">
                        <Link href={`/admin/calls/${call.id}`} className="btn btn-sm btn-light border-0 text-primary">
                          <i className="bi bi-eye x-small"></i>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: 60, height: 60}}>
                <i className="bi bi-chat-left-text text-secondary opacity-25 fs-4"></i>
              </div>
              <p className="text-secondary small mb-0">No interaction history found.</p>
              <p className="text-secondary x-small">Start a new call to record the first interaction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
