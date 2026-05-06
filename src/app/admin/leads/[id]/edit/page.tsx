import React from "react";
import { getLeadById } from "../../actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditLeadForm from "./EditLeadForm";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href="/admin/leads" className="btn btn-link text-secondary text-decoration-none p-0 mb-2">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Leads</span>
        </Link>
        <div className="d-flex align-items-center gap-2">
          <h3 className="fw-bold mb-0">Edit Lead: {lead.name}</h3>
        </div>
        <p className="text-secondary x-small mt-1">Update information for this specific record.</p>
      </div>

      <EditLeadForm lead={lead} id={id} />
    </div>
  );
}
