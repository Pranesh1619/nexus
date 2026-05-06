import React from "react";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  async function handleSubmit(formData: FormData) {
    "use server";
    const status = formData.get("status") as string;
    const stage = formData.get("stage") as string;
    const notes = formData.get("notes") as string;
    const aiScore = parseInt(formData.get("aiScore") as string);

    await prisma.callLog.update({
      where: { id },
      data: {
        status,
        stage,
        notes,
        aiScore,
      },
    });

    revalidatePath(`/admin/calls/${id}`);
    revalidatePath("/admin/calls");
    redirect(`/admin/calls/${id}`);
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

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form action={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Connection Status</label>
                <select name="status" className="form-select form-select-sm bg-light border-0 small px-3" style={{ height: '40px' }} defaultValue={call.status}>
                  <option value="CONNECTED">Connected</option>
                  <option value="MISSED">Missed</option>
                  <option value="VOICEMAIL">Voicemail</option>
                  <option value="BUSY">Busy</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Manual AI Quality Override (%)</label>
                <input name="aiScore" type="number" min="0" max="100" className="form-control form-control-sm bg-light border-0 small px-3" style={{ height: '40px' }} defaultValue={call.aiScore || 0} />
              </div>
              <div className="col-md-12">
                <label className="form-label">Lead Progression Stage</label>
                <select name="stage" className="form-select form-select-sm bg-light border-0 small px-3 py-2" defaultValue={call.stage}>
                  <option value="New Lead">New Lead</option>
                  <option value="Attempted Contact">Attempted Contact</option>
                  <option value="Connected">Connected</option>
                  <option value="Enquiry">Enquiry</option>
                  <option value="Engaged">Engaged</option>
                  <option value="Interested">Interested</option>
                  <option value="Desire">Desire</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Follow-up Needed">Follow-up Needed</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="col-md-12">
                <label className="form-label">Professional Agent Observations</label>
                <textarea name="notes" className="form-control form-control-sm bg-light border-0 small px-3 py-2" rows={5} defaultValue={call.notes || ""} placeholder="Document key takeaways, objections, and next steps..."></textarea>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <Link href={`/admin/calls/${id}`} className="btn btn-light border-0 px-3 py-2 small">Cancel</Link>
              <button type="submit" className="btn btn-primary px-4 py-2 small fw-bold shadow-sm">Save Documentation</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
