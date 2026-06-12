"use server";

import { prisma } from "@/lib/db";

export async function getCallLogs(userId?: string) {
  if (userId) {
    return await prisma.callLog.findMany({
      where: { userId },
      include: {
        lead: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
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

export async function updateCallStage(id: string, stage: string, outcome?: "WON" | "LOST") {
  const { revalidatePath } = await import("next/cache");

  // Update the Call Log stage & AI score
  const updatedCall = await prisma.callLog.update({
    where: { id },
    data: {
      stage,
      ...(stage === "Closed" ? { aiScore: outcome === "LOST" ? 0 : 100 } : {})
    },
    include: { lead: true }
  });

  // Map call stages to lead statuses
  let leadStatus = "CONTACTED";
  if (stage === "New Lead") leadStatus = "NEW";
  if (["Interested", "Qualified", "Follow-up Needed", "Desire", "Enquiry"].includes(stage)) leadStatus = "QUALIFIED";
  if (stage === "Closed") {
    leadStatus = outcome === "LOST" ? "LOST" : "WON";
  }

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

export async function updateCallDocumentation(id: string, formData: FormData) {
  const { revalidatePath } = await import("next/cache");
  const status = formData.get("status") as string;
  const stage = formData.get("stage") as string;
  const notes = formData.get("notes") as string;
  const aiScore = parseInt(formData.get("aiScore") as string) || 0;

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
}

export async function simulateCallAnalysis(id: string) {
  const { revalidatePath } = await import("next/cache");
  const { generateConversation } = await import("@/lib/transcription");

  const call = await prisma.callLog.findUnique({
    where: { id },
    include: { lead: true, user: true }
  });

  if (!call) return;

  const leadName = call.lead?.name || "Client";
  const companyName = call.lead?.company || "N/A";
  const agentName = call.user?.name || "Sales Representative";
  
  const mockResult = generateConversation(
    leadName,
    companyName,
    agentName,
    "English",
    call.stage || "Interested"
  );

  await prisma.callLog.update({
    where: { id },
    data: {
      transcript: mockResult.transcript,
      translatedText: mockResult.translatedText,
      detectedVoiceLanguage: mockResult.detectedVoiceLanguage,
      translatedLanguage: mockResult.translatedLanguage,
      wordCount: mockResult.wordCount,
      analysis: mockResult.analysis,
      aiScore: mockResult.aiScore,
      notes: `Simulated validation successfully completed. Score: ${mockResult.aiScore}%`
    }
  });

  revalidatePath(`/admin/calls/${id}`);
  revalidatePath("/admin/calls");
}
