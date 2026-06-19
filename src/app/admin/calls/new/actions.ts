"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import twilio from "twilio";
import { generateOverallSummaryFromLLM } from "@/lib/transcription";

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
    const config = await prisma.sipTrunkConfig.findUnique({
      where: { id: "default_sip_config" }
    });
    if (config) {
      return {
        domain: config.domain,
        username: config.username,
        callerId: config.callerId,
        codec: config.codec,
        isActive: config.isActive,
        mockTwilioUrl: config.mockTwilioUrl || "",
        useRealTwilio: process.env.USE_REAL_TWILIO === "true"
      };
    }
  } catch (error) {
    console.error("Failed to load active SIP config:", error);
  }
  return null;
}

export async function placeRealTwilioCall(leadId: string, currentHost?: string, language?: string, userId?: string) {
  try {
    // 1. Fetch Lead phone number
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return { error: "Lead not found in database." };
    }

    // 2. Fetch SIP Trunk Config
    const sipConfig = await prisma.sipTrunkConfig.findUnique({
      where: { id: "default_sip_config" }
    });

    const useRealTwilio = process.env.USE_REAL_TWILIO === "true";
    const mockTwilioUrl = !useRealTwilio ? ((sipConfig as any)?.mockTwilioUrl || process.env.MOCK_TWILIO_URL || "http://localhost:5050") : null;
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC_mock_sid";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "mock_token";

    if (useRealTwilio) {
      if (!sipConfig || !sipConfig.isActive || !sipConfig.callerId) {
        return { error: "No active SIP Trunk configuration found. Please check your settings." };
      }
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return { error: "Twilio credentials are not configured in your .env file." };
      }
    }

    const callerId = sipConfig?.callerId || "+10000000000";

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

    let callSid = "";
    if (mockTwilioUrl) {
      console.log(`[SYSTEM] Self-hosted Twilio URL detected: ${mockTwilioUrl}`);
      const bodyParams = new URLSearchParams();
      bodyParams.append("To", formattedPhone);
      bodyParams.append("From", callerId);
      bodyParams.append("Url", `${hostUrl}/api/twilio/voice?leadId=${leadId}&lang=${selectedLang}`);
      bodyParams.append("RecordingStatusCallback", `${hostUrl}/api/twilio/recording-callback?leadId=${leadId}&lang=${selectedLang}&userId=${activeUserId}`);

      const response = await fetch(`${mockTwilioUrl}/2010-04-01/Accounts/${accountSid}/Calls.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64")
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        const errText = await response.text();
        return { error: `Mock Twilio Server Error: ${response.status} - ${errText}` };
      }

      const resData = await response.json();
      callSid = resData.sid;
    } else {
      const client = twilio(accountSid, authToken);
      const call = await client.calls.create({
        url: `${hostUrl}/api/twilio/voice?leadId=${leadId}&lang=${selectedLang}`,
        to: formattedPhone,
        from: callerId,
        record: true,
        recordingStatusCallback: `${hostUrl}/api/twilio/recording-callback?leadId=${leadId}&lang=${selectedLang}&userId=${activeUserId}`
      });
      callSid = call.sid;
    }

    return { success: true, callSid };
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
  try {
    const useRealTwilio = process.env.USE_REAL_TWILIO === "true";
    const mockTwilioUrl = !useRealTwilio ? (process.env.MOCK_TWILIO_URL || "http://localhost:5050") : null;

    const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC_mock_sid";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "mock_token";

    if (useRealTwilio && (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)) {
      return { error: "Twilio credentials are not configured in your .env file." };
    }

    if (mockTwilioUrl) {
      console.log(`[SYSTEM] Self-hosted Twilio hangup requested for CallSid: ${callSid} using URL: ${mockTwilioUrl}`);
      const bodyParams = new URLSearchParams();
      bodyParams.append("Status", "completed");

      const response = await fetch(`${mockTwilioUrl}/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64")
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        const errText = await response.text();
        return { error: `Mock Twilio Server Hangup Error: ${response.status} - ${errText}` };
      }
      return { success: true };
    } else {
      const client = twilio(accountSid, authToken);
      await client.calls(callSid).update({ status: "completed" });
      return { success: true };
    }
  } catch (error: any) {
    console.error("Error programmatically ending Twilio call:", error);
    return { error: error.message || "Failed to terminate Twilio call." };
  }
}

export async function getTwilioCallStatus(callSid: string) {
  try {
    const useRealTwilio = process.env.USE_REAL_TWILIO === "true";
    const mockTwilioUrl = !useRealTwilio ? (process.env.MOCK_TWILIO_URL || "http://localhost:5050") : null;

    const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC_mock_sid";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "mock_token";

    if (useRealTwilio && (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)) {
      return null;
    }

    if (mockTwilioUrl) {
      const response = await fetch(`${mockTwilioUrl}/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64")
        }
      });
      if (!response.ok) return null;
      const resData = await response.json();
      return resData.status; // "queued", "ringing", "in-progress", "completed", "failed"
    } else {
      const client = twilio(accountSid, authToken);
      const call = await client.calls(callSid).fetch();
      return call.status; // "queued", "ringing", "in-progress", "completed", "failed", "busy", "no-answer", "canceled"
    }
  } catch (error) {
    console.error("Error fetching live Twilio call status:", error);
    return null;
  }
}

export async function getOverallSummary(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        calls: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!lead) {
      return "Lead not found.";
    }

    if (lead.calls.length === 0) {
      return "No calls have been logged for this lead yet.";
    }

    return await generateOverallSummaryFromLLM(lead.name, lead.company, lead.calls);
  } catch (error: any) {
    console.error("Error in getOverallSummary Server Action:", error);
    return `Failed to compile overall summary: ${error.message || error}`;
  }
}

