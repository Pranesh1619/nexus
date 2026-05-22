"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import twilio from "twilio";

export async function saveCallLog(data: {
  leadId: string;
  userId: string;
  duration: number;
  status: string;
  stage: string;
  transcript: string;
  translatedText?: string;
  detectedVoiceLanguage?: string;
  translatedLanguage?: string;
  wordCount?: number;
  analysis: string;
  aiScore?: number;
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
      translatedText: data.translatedText,
      detectedVoiceLanguage: data.detectedVoiceLanguage,
      translatedLanguage: data.translatedLanguage,
      wordCount: data.wordCount,
      analysis: data.analysis,
      aiScore: data.aiScore ?? 0,
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

export async function getActiveSipConfig() {
  try {
    const config = await prisma.sipTrunkConfig.findFirst({
      where: { isActive: true }
    });
    if (config) {
      return {
        domain: config.domain,
        username: config.username,
        callerId: config.callerId,
        codec: config.codec,
        isActive: true
      };
    }
  } catch (error) {
    console.error("Failed to load active SIP config:", error);
  }
  return null;
}

export async function placeRealTwilioCall(leadId: string, currentHost?: string, language?: string, userId?: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { error: "Twilio credentials are not configured in your .env file." };
  }

  try {
    // 1. Fetch Lead phone number
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return { error: "Lead not found in database." };
    }

    // 2. Fetch Active SIP Trunk Config
    const sipConfig = await prisma.sipTrunkConfig.findFirst({
      where: { isActive: true }
    });

    if (!sipConfig || !sipConfig.callerId) {
      return { error: "No active SIP Trunk configuration found. Please check your settings." };
    }

    const client = twilio(accountSid, authToken);

    // Format phone number to E.164 (ensure it has the country code)
    let formattedPhone = lead.phone.replace(/[^\d+]/g, ""); // Keep only digits and +
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.startsWith("91") && formattedPhone.length === 12) {
        formattedPhone = "+" + formattedPhone;
      } else {
        formattedPhone = "+91" + formattedPhone; // Default to India (+91)
      }
    }

    const hostUrl = process.env.APP_URL || currentHost || "http://localhost:3000";
    const selectedLang = language || "English";
    const activeUserId = userId || "placeholder";

    // Call out with a dynamic XML webhook url, enable call recording, and specify the recordingStatusCallback route
    const call = await client.calls.create({
      url: `${hostUrl}/api/twilio/voice?leadId=${leadId}&lang=${selectedLang}`,
      to: formattedPhone,
      from: sipConfig.callerId,
      record: true,
      recordingStatusCallback: `${hostUrl}/api/twilio/recording-callback?leadId=${leadId}&lang=${selectedLang}&userId=${activeUserId}`
    });

    return { success: true, callSid: call.sid };
  } catch (error: any) {
    console.error("Twilio Outbound Call Error:", error);
    return { error: error.message || "Failed to trigger outbound call via Twilio." };
  }
}

export async function syncSipCallLog(data: {
  leadId: string;
  callSid: string;
  duration: number;
  stage: string;
  userId: string;
}) {
  let finalUserId = data.userId;
  if (finalUserId === "placeholder") {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) finalUserId = firstUser.id;
  }

  // Check if call log already exists with this Twilio CallSid
  const logs = await prisma.callLog.findMany({
    where: { jobId: data.callSid },
    orderBy: { createdAt: "desc" }
  });

  let call;
  if (logs.length > 0) {
    // Find if there's a real transcript log and a placeholder log
    const realLog = logs.find(l => l.transcript && !l.transcript.includes("Recording is being processed by Twilio"));
    const placeholderLog = logs.find(l => l.transcript && l.transcript.includes("Recording is being processed by Twilio"));

    if (realLog) {
      call = await prisma.callLog.update({
        where: { id: realLog.id },
        data: {
          stage: data.stage,
          duration: data.duration || realLog.duration,
          userId: finalUserId,
        }
      });
      // Delete placeholder if both exist
      if (placeholderLog) {
        await prisma.callLog.delete({ where: { id: placeholderLog.id } });
      }
    } else {
      // If only placeholders exist, update the newest one
      call = await prisma.callLog.update({
        where: { id: logs[0].id },
        data: {
          stage: data.stage,
          duration: data.duration || logs[0].duration,
          userId: finalUserId,
        }
      });
    }
  } else {
    // Create placeholder call log
    call = await prisma.callLog.create({
      data: {
        jobId: data.callSid,
        leadId: data.leadId,
        userId: finalUserId,
        duration: data.duration,
        status: "CONNECTED",
        stage: data.stage,
        transcript: JSON.stringify([
          {
            speaker: "Agent",
            time: "00:00",
            text: "Recording is being processed by Twilio. The transcript and analysis will appear here shortly.",
            translation: "Recording is being processed by Twilio. The transcript and analysis will appear here shortly."
          }
        ]),
        translatedText: "Recording is being processed by Twilio. The transcript and analysis will appear here shortly.",
        analysis: "Waiting for Twilio audio recording to compile and transcribe...",
        aiScore: 0,
      }
    });
  }

  // Map call stages to lead statuses
  let leadStatus = "CONTACTED";
  if (data.stage === "New Lead") leadStatus = "NEW";
  if (["Interested", "Qualified", "Follow-up Needed", "Desire", "Enquiry"].includes(data.stage)) leadStatus = "QUALIFIED";
  if (data.stage === "Closed") leadStatus = "CLOSED_WON";

  await prisma.lead.update({
    where: { id: data.leadId },
    data: { status: leadStatus }
  });

  revalidatePath("/admin/calls");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${data.leadId}`);

  return call;
}

export async function getCallLogStatus(id: string) {
  try {
    const log = await prisma.callLog.findUnique({
      where: { id }
    });
    return log;
  } catch (error) {
    console.error("Error fetching call log status:", error);
    return null;
  }
}

export async function endTwilioCall(callSid: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { error: "Twilio credentials are not configured in your .env file." };
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.calls(callSid).update({ status: "completed" });
    return { success: true };
  } catch (error: any) {
    console.error("Error programmatically ending Twilio call:", error);
    return { error: error.message || "Failed to terminate Twilio call." };
  }
}

export async function getTwilioCallStatus(callSid: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  try {
    const client = twilio(accountSid, authToken);
    const call = await client.calls(callSid).fetch();
    return call.status; // "queued", "ringing", "in-progress", "completed", "failed", "busy", "no-answer", "canceled"
  } catch (error) {
    console.error("Error fetching live Twilio call status:", error);
    return null;
  }
}
