"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveCallLog(data: {
  leadId: string;
  userId: string;
  duration: number;
  status: string;
  stage: string;
  transcript: string;
  analysis: string;
}) {
  let finalUserId = data.userId;
  if (finalUserId === "placeholder") {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) finalUserId = firstUser.id;
  }

  const call = await prisma.callLog.create({
    data: {
      leadId: data.leadId,
      userId: finalUserId,
      duration: data.duration,
      status: data.status,
      stage: data.stage,
      transcript: data.transcript,
      analysis: data.analysis,
    },
  });

  // Map call stages to lead statuses
  let leadStatus = "CONTACTED";
  if (data.stage === "New Lead") leadStatus = "NEW";
  if (["Interested", "Qualified", "Follow-up Needed", "Desire", "Enquiry"].includes(data.stage)) leadStatus = "QUALIFIED";
  if (data.stage === "Closed") leadStatus = "CLOSED_WON";

  // Update the Lead status as well
  await prisma.lead.update({
    where: { id: data.leadId },
    data: { status: leadStatus }
  });

  revalidatePath("/admin/calls");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${data.leadId}`);
  
  return call;
}
