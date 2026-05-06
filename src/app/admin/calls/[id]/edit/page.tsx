import React from "react";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditCallForm from "./EditCallForm";

export const dynamic = "force-dynamic";

export default async function EditCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await prisma.callLog.findUnique({
    where: { id },
    include: { lead: true, user: true },
  });

  if (!call) {
    notFound();
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link href={`/admin/calls/${id}`} className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
          <i className="bi bi-chevron-left x-small"></i> <span className="x-small fw-bold uppercase">Back to Analysis</span>
        </Link>
        <h3 className="fw-bold mb-1">Update Call Documentation: {call.lead.name}</h3>
        <p className="text-secondary x-small mt-1">Review and refine the AI analysis metadata and agent observations.</p>
      </div>

      <EditCallForm call={call} id={id} />
    </div>
  );
}
