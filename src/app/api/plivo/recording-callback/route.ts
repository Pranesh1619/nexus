import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { transcribeAndAnalyzeRecording } from "@/lib/transcription";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    const lang = searchParams.get("lang") || "English";
    const userId = searchParams.get("userId") || "";
    const callType = searchParams.get("callType") || "";
    const isWebRTC = callType === "webrtc";
    const requestUuid = searchParams.get("callSid") || "";

    // Parse Plivo callback POST body
    let formData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error("[Plivo Callback] Failed to parse form data:", e);
      return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
    }

    console.log("[Plivo Callback] Payload received:", Array.from(formData.entries()));

    const recordingUrl = (formData.get("RecordUrl") as string) || (formData.get("RecordURL") as string) || "";
    const rawDuration = (formData.get("RecordingDuration") as string) || (formData.get("recording_duration") as string) || "";
    const callSid = (formData.get("CallUUID") as string) || (formData.get("call_uuid") as string) || "";

    if (rawDuration === "-1") {
      console.log(`[Plivo Callback] Recording started/in-progress for CallUUID: ${callSid}. Skipping download and transcription until completed.`);
      return NextResponse.json({ success: true, message: "Recording is in progress" });
    }

    const recordingDurationSec = parseInt(rawDuration || "0") || 0;

    const fromPhone = (formData.get("From") as string) || "";
    const toPhone = (formData.get("To") as string) || "";

    let resolvedLeadId = leadId;
    let lead = null;

    if (resolvedLeadId) {
      lead = await prisma.lead.findUnique({
        where: { id: resolvedLeadId }
      });
    } else if (fromPhone) {
      const cleanFrom = fromPhone.replace(/\D/g, "");
      const last10Digits = cleanFrom.slice(-10);

      if (last10Digits.length >= 7) {
        const allLeads = await prisma.lead.findMany();
        lead = allLeads.find(l => {
          const cleanLeadPhone = l.phone.replace(/\D/g, "");
          return cleanLeadPhone.endsWith(last10Digits) || cleanFrom.endsWith(cleanLeadPhone.slice(-10));
        });
      }

      if (lead) {
        resolvedLeadId = lead.id;
        console.log(`[INBOUND Plivo Webhook] Resolved incoming caller ${fromPhone} to existing Lead: ${lead.name}`);
      } else {
        lead = await prisma.lead.create({
          data: {
            name: `New User (${fromPhone})`,
            phone: fromPhone,
            status: "NEW",
            source: "INBOUND_CALL"
          }
        });
        resolvedLeadId = lead.id;
        console.log(`[INBOUND Plivo Webhook] Created new Lead for unrecognized caller: ${fromPhone}`);
      }
    }

    if (!resolvedLeadId) {
      return NextResponse.json({ error: "Missing leadId parameter and caller identification" }, { status: 400 });
    }

    // Save Plivo recording audio locally
    if (recordingUrl && callSid) {
      try {
        const fs = require("fs");
        const path = require("path");
        const recordingsDir = path.join(process.cwd(), "public", "recordings");
        
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
        }
        
        const now = new Date();
        const dateStr = now.getFullYear() + "-" + 
                        String(now.getMonth() + 1).padStart(2, "0") + "-" + 
                        String(now.getDate()).padStart(2, "0") + "_" + 
                        String(now.getHours()).padStart(2, "0") + "-" + 
                        String(now.getMinutes()).padStart(2, "0") + "-" + 
                        String(now.getSeconds()).padStart(2, "0");
        const filename = `${dateStr}_${callSid}.mp3`;
        const localPath = path.join(recordingsDir, filename);
        
        const sipConfig = await prisma.sipTrunkConfig.findFirst({
          where: { isActive: true }
        });
        const plivoAuthId = sipConfig?.plivoAuthId || process.env.PLIVO_AUTH_ID || "";
        const plivoAuthToken = sipConfig?.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "";
        const authHeader = "Basic " + Buffer.from(`${plivoAuthId}:${plivoAuthToken}`).toString("base64");

        let audioResponse;
        if (plivoAuthId && plivoAuthToken) {
          audioResponse = await fetch(recordingUrl, {
            headers: {
              Authorization: authHeader
            }
          });
        }
        if (!audioResponse || !audioResponse.ok) {
          audioResponse = await fetch(recordingUrl);
        }

        if (audioResponse.ok) {
          const buffer = Buffer.from(await audioResponse.arrayBuffer());
          fs.writeFileSync(localPath, buffer);
          console.log(`[LOCAL STORAGE] Plivo audio recording saved locally to: ${localPath}`);
        } else {
          console.error(`[LOCAL STORAGE] Failed to download Plivo audio: ${audioResponse.statusText}`);
        }
      } catch (err) {
        console.error("[LOCAL STORAGE] Error saving Plivo call audio locally:", err);
      }
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    let agentId = userId;
    if (!agentId || agentId === "placeholder") {
      if (lead && lead.assignedTo) {
        agentId = lead.assignedTo;
      } else {
        const firstUser = await prisma.user.findFirst();
        agentId = firstUser ? firstUser.id : "";
      }
    }
    const agent = agentId ? await prisma.user.findUnique({ where: { id: agentId } }) : null;
    const agentName = agent ? agent.name : "Sales Advisor";

    let conversation;
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey && recordingUrl) {
      try {
        conversation = await transcribeAndAnalyzeRecording(
          recordingUrl,
          apiKey,
          lead.name,
          agentName,
          lang,
          isWebRTC
        );
      } catch (err: any) {
        console.error("Plivo Transcription failed:", err);
        
        let errorMessage = "Speech Transcription error.";
        if (err.message && err.message.includes("429")) {
          errorMessage = "API Quota Exceeded (Billing Error 429). Please verify your billing settings or API key limits.";
        } else if (err.message) {
          errorMessage = err.message;
        }

        conversation = {
          detectedVoiceLanguage: lang,
          translatedLanguage: "English",
          transcript: JSON.stringify([
            {
              speaker: "Agent",
              time: "00:00",
              text: `[SYSTEM ERROR] ${errorMessage}`,
              translation: `[SYSTEM ERROR] ${errorMessage}`
            }
          ]),
          translatedText: `[SYSTEM ERROR] ${errorMessage}`,
          wordCount: 0,
          analysis: `Failed to transcribe call recording: ${errorMessage}`,
          aiScore: 0
        };
      }
    } else {
      let errorMessage = "API Key is missing. Please configure GEMINI_API_KEY or OPENAI_API_KEY in your .env file.";
      if (!recordingUrl) {
        errorMessage = "No recording audio file found from Plivo.";
      }
      
      conversation = {
        detectedVoiceLanguage: lang,
        translatedLanguage: "English",
        transcript: JSON.stringify([
          {
            speaker: "Agent",
            time: "00:00",
            text: `[SYSTEM ERROR] ${errorMessage}`,
            translation: `[SYSTEM ERROR] ${errorMessage}`
          }
        ]),
        translatedText: `[SYSTEM ERROR] ${errorMessage}`,
        wordCount: 0,
        analysis: `Failed to transcribe call recording: ${errorMessage}`,
        aiScore: 0
      };
    }

    if (conversation && conversation.transcript) {
      try {
        const turns = JSON.parse(conversation.transcript);
        if (Array.isArray(turns)) {
          console.log(`\n========================================`);
          console.log(`📞 OUTBOUND TELEPHONY CALL DIALOGUE TRANSCRIPT (PLIVO)`);
          console.log(`========================================`);
          turns.forEach((turn: any) => {
            const speakerName = turn.speaker === "Agent" ? agentName : lead.name;
            console.log(`[TRANSCRIPT] ${speakerName}: ${turn.text}`);
          });
          console.log(`========================================\n`);
        }
      } catch (e) {
        // Ignore
      }
    }

    const whereConditions: any[] = [{ jobId: callSid }];
    if (requestUuid) {
      whereConditions.push({ jobId: requestUuid });
      whereConditions.push({ notes: { contains: `[RequestUUID: ${requestUuid}]` } });
    }

    const existingCallLog = await prisma.callLog.findFirst({
      where: { OR: whereConditions }
    });

    if (existingCallLog) {
      const updatedNotes = existingCallLog.notes
        ? (existingCallLog.notes.includes("[RequestUUID:") ? existingCallLog.notes : `[RequestUUID: ${requestUuid}] ${existingCallLog.notes}`.trim())
        : `Call recorded successfully via Plivo. ${requestUuid ? `[RequestUUID: ${requestUuid}] ` : ""}Audio URL: ${recordingUrl}`.trim();

      await prisma.callLog.update({
        where: { id: existingCallLog.id },
        data: {
          jobId: callSid,
          duration: recordingDurationSec || existingCallLog.duration,
          transcript: conversation.transcript,
          translatedText: conversation.translatedText,
          detectedVoiceLanguage: conversation.detectedVoiceLanguage,
          translatedLanguage: conversation.translatedLanguage,
          wordCount: conversation.wordCount,
          analysis: conversation.analysis,
          aiScore: conversation.aiScore,
          audioUrl: recordingUrl,
          notes: updatedNotes,
          callerPhone: existingCallLog.callerPhone || fromPhone || null,
          receiverPhone: existingCallLog.receiverPhone || toPhone || null
        }
      });
      console.log(`Updated CallLog ${existingCallLog.id} with Plivo recording transcription.`);
    } else {
      await prisma.callLog.create({
        data: {
          jobId: callSid,
          leadId: resolvedLeadId,
          userId: agentId,
          duration: recordingDurationSec,
          status: "CONNECTED",
          stage: "Interested",
          transcript: conversation.transcript,
          translatedText: conversation.translatedText,
          detectedVoiceLanguage: conversation.detectedVoiceLanguage,
          translatedLanguage: conversation.translatedLanguage,
          wordCount: conversation.wordCount,
          analysis: conversation.analysis,
          aiScore: conversation.aiScore,
          audioUrl: recordingUrl,
          notes: `Automatic logging from Plivo recording callback. ${requestUuid ? `[RequestUUID: ${requestUuid}] ` : ""}Audio URL: ${recordingUrl}`.trim(),
          callerPhone: fromPhone || null,
          receiverPhone: toPhone || null
        }
      });
      console.log(`Created new CallLog from Plivo recording callback for CallSid: ${callSid}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Plivo Recording Callback Webhook Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process callback" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
