"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { updateZohoBiginStatus } from "@/lib/zoho";

export async function updateAgentLead(id: string, data: {
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  status: string;
}) {
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      company: data.company || null,
      source: data.source || null,
      status: data.status,
    },
  });

  if (lead && lead.phone) {
    try {
      await updateZohoBiginStatus(lead.phone, data.status);
    } catch (e) {
      console.error("[ZOHO SYNC] Error syncing lead status during agent update:", e);
    }
  }

  revalidatePath("/admin/agents");
  revalidatePath("/admin/leads");
  return lead;
}

export async function logAgentLeadCall(data: {
  leadId: string;
  userId: string;
  duration: number;
  status: string;
  stage: string;
  notes?: string | null;
  transcript?: string | null;
  aiScore?: number;
}) {
  const call = await prisma.callLog.create({
    data: {
      leadId: data.leadId,
      userId: data.userId,
      duration: data.duration,
      status: data.status,
      stage: data.stage,
      notes: data.notes || "",
      transcript: data.transcript || "",
      aiScore: data.aiScore || 0,
    },
  });

  // Map call stages to lead statuses
  let leadStatus = "CONTACTED";
  if (data.stage === "New Lead") leadStatus = "NEW";
  if (["Interested", "Qualified", "Follow-up Needed", "Desire", "Enquiry"].includes(data.stage)) leadStatus = "QUALIFIED";
  if (data.stage === "Closed") leadStatus = "WON";

  const lead = await prisma.lead.update({
    where: { id: data.leadId },
    data: { status: leadStatus }
  });

  if (lead && lead.phone) {
    try {
      await updateZohoBiginStatus(lead.phone, leadStatus);
    } catch (e) {
      console.error("[ZOHO SYNC] Error syncing lead status during call log:", e);
    }
  }

  revalidatePath("/admin/agents");
  revalidatePath("/admin/calls");
  return call;
}

export async function updateAgentLeadCall(id: string, data: {
  status: string;
  stage: string;
  notes?: string | null;
  aiScore?: number;
  transcript?: string | null;
}) {
  const call = await prisma.callLog.update({
    where: { id },
    data: {
      status: data.status,
      stage: data.stage,
      notes: data.notes,
      aiScore: data.aiScore || 0,
      transcript: data.transcript,
    },
  });

  revalidatePath("/admin/agents");
  revalidatePath("/admin/calls");
  return call;
}
