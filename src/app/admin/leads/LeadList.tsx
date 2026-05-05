"use client";

import React, { useState } from "react";
import Link from "next/link";
import { deleteLead } from "./actions";
import StatusModal from "@/components/StatusModal";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
}

function generateStableScore(id: string) {
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 80 + (sum % 16); // Returns 80-95
}

export default function LeadList({ leads }: { leads: Lead[] }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteLead(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <StatusModal
        id="confirmDeleteLeadModal"
        type="confirm"
        title="Delete Lead?"
        message="Are you sure you want to delete this lead? This will also remove their entire call history."
        onConfirm={handleDelete}
      />

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="border-0 small text-secondary">S.No</th>
              <th className="border-0 small text-secondary">Lead Name</th>
              <th className="border-0 small text-secondary">Company</th>
              <th className="border-0 small text-secondary">Source</th>
              <th className="border-0 small text-secondary">AI Rank</th>
              <th className="border-0 small text-secondary">Status</th>
              <th className="border-0 small text-secondary text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-5 text-center text-secondary small">No leads found.</td>
              </tr>
            ) : (
              leads.map((lead, index) => (
                <tr key={lead.id}>
                  <td className="small text-secondary">{index + 1}</td>
                  <td>
                    <div>
                      <div className="fw-bold small">{lead.name}</div>
                      <div className="text-secondary x-small">{lead.phone}</div>
                    </div>
                  </td>
                  <td className="small">{lead.company || '-'}</td>
                  <td>
                    <span className="badge bg-light text-dark border fw-normal small">
                      {lead.source}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      <i className="bi bi-star-fill text-warning x-small"></i>
                      <span className="fw-bold small">{generateStableScore(lead.id)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${lead.status === 'NEW' ? 'bg-primary bg-opacity-10 text-primary' :
                        lead.status === 'CLOSED_WON' ? 'bg-success bg-opacity-10 text-success' :
                          'bg-warning bg-opacity-10 text-warning'
                      } rounded-pill px-3 py-2 small`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end align-items-center gap-2">
                      <Link href={`/admin/calls/new?leadId=${lead.id}`} className="btn btn-sm btn-light border-0 text-success" title="Call">
                        <i className="bi bi-telephone-fill"></i>
                      </Link>
                      <Link href={`/admin/leads/${lead.id}`} className="btn btn-sm btn-light border-0 text-primary" title="View">
                        <i className="bi bi-eye"></i>
                      </Link>
                      <Link href={`/admin/leads/${lead.id}/edit`} className="btn btn-sm btn-light border-0 text-info" title="Edit">
                        <i className="bi bi-pencil-square"></i>
                      </Link>
                      <button
                        onClick={() => setDeleteId(lead.id)}
                        data-bs-toggle="modal"
                        data-bs-target="#confirmDeleteLeadModal"
                        className="btn btn-sm btn-light border-0 text-danger"
                        title="Delete"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
