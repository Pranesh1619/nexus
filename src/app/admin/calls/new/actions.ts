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
        useRealTwilio: process.env.USE_REAL_TWILIO === "true",
        telephonyProvider: config.telephonyProvider || "TWILIO",
        plivoAuthId: config.plivoAuthId || "",
        plivoAuthToken: config.plivoAuthToken || ""
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

    const hostUrl = currentHost || process.env.APP_URL || "http://localhost:3000";
    const selectedLang = language || "English";
    const activeUserId = userId || "placeholder";

    // 3. Format phone number to E.164 (ensure it has the country code)
    let formattedPhone = lead.phone.replace(/[^\d+]/g, ""); // Keep only digits and +
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.startsWith("91") && formattedPhone.length === 12) {
        formattedPhone = "+" + formattedPhone;
      } else {
        formattedPhone = "+91" + formattedPhone; // Default to India (+91)
      }
    }

    const callerId = sipConfig?.callerId || "+10000000000";

    // 4. Delegate to Plivo if chosen
    if (sipConfig?.telephonyProvider === "PLIVO") {
      const authId = sipConfig.plivoAuthId || process.env.PLIVO_AUTH_ID || "";
      const authToken = sipConfig.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "";
      
      if (!authId || !authToken) {
        return { error: "Plivo credentials are not configured. Please check your settings." };
      }

      console.log(`[Plivo Outbound] Placing call to customer: ${formattedPhone} via Plivo`);
      
      const plivoResponse = await fetch(`https://api.plivo.com/v1/Account/${authId}/Call/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${authId}:${authToken}`).toString("base64")
        },
        body: JSON.stringify({
          from: callerId,
          to: formattedPhone,
          answer_url: `${hostUrl}/api/plivo/voice?leadId=${leadId}&lang=${selectedLang}`,
          answer_method: "POST"
        })
      });

      if (!plivoResponse.ok) {
        const errText = await plivoResponse.text();
        return { error: `Plivo Call Initiation Error: ${plivoResponse.status} - ${errText}` };
      }

      const resData = await plivoResponse.json();
      const callSid = resData.request_uuid; // Plivo returns request_uuid immediately

      console.log(`[Plivo Outbound] Call successfully fired. request_uuid: ${callSid}`);
      return { success: true, callSid };
    }

    // 5. Default to Twilio (Real or Mock)
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

export async function placeClickToCall(params: {
  leadId: string;
  agentPhone: string;
  language?: string;
  userId?: string;
  currentHost?: string;
}) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId }
    });

    if (!lead) {
      return { error: "Lead not found in database." };
    }

    const sipConfig = await prisma.sipTrunkConfig.findUnique({
      where: { id: "default_sip_config" }
    });

    const formatPhone = (num: string) => {
      let formatted = num.replace(/[^\d+]/g, "");
      if (!formatted.startsWith("+")) {
        if (formatted.startsWith("91") && formatted.length === 12) {
          formatted = "+" + formatted;
        } else {
          formatted = "+91" + formatted;
        }
      }
      return formatted;
    };

    const agentPhoneFormatted = formatPhone(params.agentPhone);
    const customerPhoneFormatted = formatPhone(lead.phone);
    const callerId = sipConfig?.callerId || "+10000000000";

    const hostUrl = params.currentHost || process.env.APP_URL || "http://localhost:3000";
    const selectedLang = params.language || "English";
    const activeUserId = params.userId || "placeholder";

    // 1. Delegate to Plivo if chosen
    if (sipConfig?.telephonyProvider === "PLIVO") {
      const authId = sipConfig.plivoAuthId || process.env.PLIVO_AUTH_ID || "";
      const authToken = sipConfig.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "";

      if (!authId || !authToken) {
        return { error: "Plivo credentials are not configured. Please check your settings." };
      }

      console.log(`[Plivo Click-to-Call] Dialing Agent ${agentPhoneFormatted} first`);

      const requestUuid = "plivo_ctc_" + Math.random().toString(36).substr(2, 9);
      const voiceConnectUrl = `${hostUrl}/api/plivo/voice-connect?destPhone=${encodeURIComponent(customerPhoneFormatted)}&leadId=${params.leadId}&lang=${selectedLang}&userId=${activeUserId}&callSid=${requestUuid}`;

      const plivoResponse = await fetch(`https://api.plivo.com/v1/Account/${authId}/Call/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${authId}:${authToken}`).toString("base64")
        },
        body: JSON.stringify({
          from: callerId,
          to: agentPhoneFormatted,
          answer_url: voiceConnectUrl,
          answer_method: "POST"
        })
      });

      if (!plivoResponse.ok) {
        const errText = await plivoResponse.text();
        return { error: `Plivo Click-to-Call Error: ${plivoResponse.status} - ${errText}` };
      }

      const resData = await plivoResponse.json();
      // Return the generated requestUuid so the database key matches the voice-connect webhook query params perfectly
      const callSid = requestUuid;

      console.log(`[Plivo Click-to-Call] Call successfully fired to Agent. request_uuid: ${resData.request_uuid}, local tracking ID: ${callSid}`);
      return { success: true, callSid };
    }

    // 2. Default to Twilio (Real or Mock)
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

    // Build the voice connect url which Twilio will call when the agent answers.
    // When the agent answers, voice-connect TwiML will <Dial> the customer phone number.
    const voiceConnectUrl = `${hostUrl}/api/twilio/voice-connect?destPhone=${encodeURIComponent(customerPhoneFormatted)}&leadId=${params.leadId}&lang=${selectedLang}&userId=${activeUserId}`;

    let callSid = "";
    if (mockTwilioUrl) {
      console.log(`[SYSTEM] Click-to-Call: Self-hosted Twilio URL detected: ${mockTwilioUrl}`);
      const bodyParams = new URLSearchParams();
      bodyParams.append("To", agentPhoneFormatted);
      bodyParams.append("From", callerId);
      bodyParams.append("Url", voiceConnectUrl);

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
        url: voiceConnectUrl,
        to: agentPhoneFormatted,
        from: callerId,
      });
      callSid = call.sid;
    }

    return { success: true, callSid };
  } catch (error: any) {
    console.error("Twilio Click-to-Call Error:", error);
    return { error: error.message || "Failed to trigger Click-to-Call via Twilio." };
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

  // Check if call log already exists with this Twilio CallSid or mapped Plivo RequestUUID
  const logs = await prisma.callLog.findMany({
    where: {
      OR: [
        { jobId: data.callSid },
        { notes: { contains: `[RequestUUID: ${data.callSid}]` } }
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  const sipConfig = await prisma.sipTrunkConfig.findUnique({
    where: { id: "default_sip_config" }
  });
  const providerName = sipConfig?.telephonyProvider === "PLIVO" ? "Plivo" : "Twilio";

  let call;
  if (logs.length > 0) {
    // Find if there's a real transcript log and a placeholder log
    const realLog = logs.find(l => l.transcript && !l.transcript.includes("Recording is being processed"));
    const placeholderLog = logs.find(l => l.transcript && l.transcript.includes("Recording is being processed"));

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
            text: `Recording is being processed by ${providerName}. The transcript and analysis will appear here shortly.`,
            translation: `Recording is being processed by ${providerName}. The transcript and analysis will appear here shortly.`
          }
        ]),
        translatedText: `Recording is being processed by ${providerName}. The transcript and analysis will appear here shortly.`,
        analysis: `Waiting for ${providerName} audio recording to compile and transcribe...`,
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

  // Trigger background transcription automatically if it has a jobId and no real transcript yet
  if (call.jobId && (!call.transcript || call.transcript.includes("processed"))) {
    try {
      const { startOfflineRetranscription } = require("@/lib/transcription");
      startOfflineRetranscription(call.id);
    } catch (err: any) {
      console.warn("[syncSipCallLog] Failed to trigger startOfflineRetranscription:", err.message);
    }
  }

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
    const sipConfig = await prisma.sipTrunkConfig.findUnique({
      where: { id: "default_sip_config" }
    });

    if (sipConfig?.telephonyProvider === "PLIVO") {
      const authId = sipConfig.plivoAuthId || process.env.PLIVO_AUTH_ID || "";
      const authToken = sipConfig.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "";

      if (!authId || !authToken) {
        return { error: "Plivo credentials are not configured. Please check your settings." };
      }

      // Check if callSid is a request_uuid mapped to a CallUUID in database
      let activeCallSid = callSid;
      try {
        const mappedLog = await prisma.callLog.findFirst({
          where: {
            OR: [
              { jobId: callSid },
              { notes: { contains: `[RequestUUID: ${callSid}]` } }
            ]
          }
        });
        if (mappedLog && mappedLog.jobId && mappedLog.jobId !== callSid) {
          activeCallSid = mappedLog.jobId;
        }
      } catch (dbErr) {
        console.error("[Plivo Hangup] Error checking mapped call log:", dbErr);
      }

      console.log(`[Plivo Hangup] Requesting hangup for Call: ${activeCallSid}`);
      
      const response = await fetch(`https://api.plivo.com/v1/Account/${authId}/Call/${activeCallSid}/`, {
        method: "DELETE",
        headers: {
          Authorization: "Basic " + Buffer.from(`${authId}:${authToken}`).toString("base64")
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: true };
        }
        const errText = await response.text();
        return { error: `Plivo Hangup Error: ${response.status} - ${errText}` };
      }

      return { success: true };
    }

    const useRealTwilio = process.env.USE_REAL_TWILIO === "true";
    const mockTwilioUrl = !useRealTwilio ? (sipConfig?.mockTwilioUrl || process.env.MOCK_TWILIO_URL || "http://localhost:5050") : null;

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
    const sipConfig = await prisma.sipTrunkConfig.findUnique({
      where: { id: "default_sip_config" }
    });

    if (sipConfig?.telephonyProvider === "PLIVO") {
      const authId = sipConfig.plivoAuthId || process.env.PLIVO_AUTH_ID || "";
      const authToken = sipConfig.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "";
      
      if (!authId || !authToken) return null;

      try {
        // 1. Try to find if this is a request_uuid that has been mapped to a CallUUID in database
        let activeCallSid = callSid;
        let isMapped = false;
        
        const mappedLog = await prisma.callLog.findFirst({
          where: {
            notes: {
              contains: `[RequestUUID: ${callSid}]`
            }
          }
        });

        if (mappedLog && mappedLog.jobId) {
          activeCallSid = mappedLog.jobId;
          isMapped = true;
        }

        // 2. Query Plivo using the active Call ID (using ?status=live so it doesn't 404 for active calls)
        const response = await fetch(`https://api.plivo.com/v1/Account/${authId}/Call/${activeCallSid}/?status=live`, {
          headers: {
            Authorization: "Basic " + Buffer.from(`${authId}:${authToken}`).toString("base64")
          }
        });

        console.log(`[Plivo Status Check] activeCallSid: ${activeCallSid}, HTTP Status: ${response.status}`);

        if (response.ok) {
          const resData = await response.json();
          console.log(`[Plivo Status Check Success Response]`, resData);
          return resData.hangup_cause_code ? "completed" : "in-progress";
        }

        if (response.status === 404) {
          const errText = await response.text();
          console.log(`[Plivo Status Check 404 Response]`, errText);
          // If Plivo returns 404:
          // A. If we haven't mapped the request_uuid yet, we check the database placeholder age.
          //    If the placeholder log is very fresh (less than 45 seconds old), the call is still setting up/dialing.
          if (!isMapped) {
            const callLog = await prisma.callLog.findFirst({
              where: { jobId: callSid } // Matches placeholder
            });
            if (callLog) {
              const ageMs = Date.now() - new Date(callLog.createdAt).getTime();
              if (ageMs < 45000) {
                return "queued"; // Still in startup/dialing phase
              }
              return "completed";
            }
          } else {
            // B. If it WAS mapped, but now Plivo active call API returns 404, it means the bridged call has ended!
            return "completed";
          }
          return "queued";
        }
      } catch (err) {
        console.error("Plivo getCallStatus error:", err);
      }
      return null;
    }

    const useRealTwilio = process.env.USE_REAL_TWILIO === "true";
    const mockTwilioUrl = !useRealTwilio ? (sipConfig?.mockTwilioUrl || process.env.MOCK_TWILIO_URL || "http://localhost:5050") : null;

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
    console.error("Call status check failed:", error);
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

export async function getCurrentAgent() {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, email: true, role: true }
      });
      return user;
    }
  } catch (error) {
    console.error("Error getting current agent:", error);
  }
  return null;
}

export async function assignLeadToAgent(leadId: string, agentId: string) {
  try {
    if (!leadId || !agentId || agentId === "placeholder") return;
    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedTo: agentId }
    });
    revalidatePath("/admin/leads");
    revalidatePath("/admin/agents");
    revalidatePath("/admin/sales");
  } catch (error) {
    console.error("Error assigning lead to agent:", error);
  }
}

export async function getAllAgents() {
  try {
    const users = await prisma.user.findMany({
      where: { 
        role: "SALES"
      },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: "asc" }
    });
    return users;
  } catch (error) {
    console.error("Error getting all agents:", error);
    return [];
  }
}

