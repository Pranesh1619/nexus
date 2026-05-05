"use server";

import { prisma } from "@/lib/db";

export async function getCallLogs() {
  return await prisma.callLog.findMany({
    include: {
      lead: true,
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateCallStage(id: string, stage: string) {
  const { revalidatePath } = await import("next/cache");
  
  // Update the Call Log stage
  const updatedCall = await prisma.callLog.update({
    where: { id },
    data: { stage },
    include: { lead: true }
  });

  // Map call stages to lead statuses
  let leadStatus = "CONTACTED";
  if (stage === "New Lead") leadStatus = "NEW";
  if (["Interested", "Qualified", "Follow-up Needed", "Desire", "Enquiry"].includes(stage)) leadStatus = "QUALIFIED";
  if (stage === "Closed") leadStatus = "CLOSED_WON";

  // Update the Lead status as well
  await prisma.lead.update({
    where: { id: updatedCall.leadId },
    data: { status: leadStatus }
  });

  revalidatePath(`/admin/calls/${id}`);
  revalidatePath(`/admin/leads/${updatedCall.leadId}`);
  revalidatePath("/admin/leads");
}

export async function deleteCallLog(id: string) {
  const { revalidatePath } = await import("next/cache");
  await prisma.callLog.delete({
    where: { id },
  });
  revalidatePath("/admin/calls");
}
