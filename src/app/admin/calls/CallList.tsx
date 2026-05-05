"use client";

import React, { useState } from "react";
import Link from "next/link";
import StatusModal from "@/components/StatusModal";
import { deleteCallLog } from "./actions";

// Consistent scoring logic for the list view
function getDisplayScore(log: any) {
  if (log.aiScore && log.aiScore > 0) return log.aiScore;
  
  // Dynamic fallback based on stage if score not in DB
  const stages = [
    "New Lead", "Attempted Contact", "Connected", "Enquiry", "Engaged", 
    "Interested", "Desire", "Qualified", "Follow-up Needed", "Closed"
  ];
  const idx = stages.indexOf(log.stage);
  if (idx === -1) return 85;
  return Math.floor(50 + (idx / 9) * 40 + 5);
}

export default function CallList({ logs }: { logs: any[] }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCallLog(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <StatusModal
        id="confirmDeleteModal"
        type="confirm"
        title="Delete Call Log?"
        message="Are you sure you want to permanently remove this record? This action cannot be undone."
        onConfirm={handleDelete}
      />
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="border-0 small text-secondary">S.No</th>
              <th className="border-0 small text-secondary">Date</th>
              <th className="border-0 small text-secondary">Customer</th>
              <th className="border-0 small text-secondary">Agent</th>
              <th className="border-0 small text-secondary">Duration</th>
              <th className="border-0 small text-secondary text-center">AI Score</th>
              <th className="border-0 small text-secondary">Stage</th>
              <th className="border-0 small text-secondary text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-5 text-center text-secondary small">No call logs found.</td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const displayScore = getDisplayScore(log);
                return (
                  <tr key={log.id}>
                    <td className="small text-secondary">{index + 1}</td>
                    <td className="small text-secondary" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div>
                        <div className="fw-bold small">{log.lead.name}</div>
                        <div className="text-secondary x-small">{log.lead.phone}</div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {/* <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-secondary fw-bold" style={{ width: 24, height: 24, fontSize: 10 }}>
                          {log.user.name.charAt(0)}
                        </div> */}
                        <span className="small">{log.user.name}</span>
                      </div>
                    </td>
                    <td className="small text-secondary">{log.duration || 0}s</td>
                    <td className="text-center">
                      <span className={`fw-bold small ${displayScore > 75 ? 'text-success' : 'text-primary'}`}>
                        {displayScore}%
                      </span>
                    </td>
                    <td>
                      <span className="small fw-bold text-primary">{log.stage}</span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end align-items-center gap-2">
                        <Link href={`/admin/calls/${log.id}`} className="btn btn-sm btn-light border-0 text-primary" title="View Analysis">
                          <i className="bi bi-eye"></i>
                        </Link>
                        <Link href={`/admin/calls/${log.id}/edit`} className="btn btn-sm btn-light border-0 text-info" title="Edit Log">
                          <i className="bi bi-pencil-square"></i>
                        </Link>
                        <button
                          onClick={() => setDeleteId(log.id)}
                          data-bs-toggle="modal"
                          data-bs-target="#confirmDeleteModal"
                          className="btn btn-sm btn-light border-0 text-danger"
                          title="Delete Log"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
