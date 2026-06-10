import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateConversation, transcribeAndAnalyzeRecording } from "@/lib/transcription";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    const lang = searchParams.get("lang") || "English";
    const userId = searchParams.get("userId") || "";
    const callType = searchParams.get("callType") || "";
    const isWebRTC = callType === "webrtc";

    // Parse Twilio application/x-www-form-urlencoded POST body
    const formData = await request.formData();
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDurationSec = parseInt(formData.get("RecordingDuration") as string) || 0;
    const callSid = formData.get("CallSid") as string;

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId parameter" }, { status: 400 });
    }

    // Save Twilio recording audio locally
    if (recordingUrl && callSid) {
      try {
        const fs = require("fs");
        const path = require("path");
        const recordingsDir = path.join(process.cwd(), "public", "recordings");
        
        // Ensure folder exists
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
        const filename = `${dateStr}_${callSid}.wav`;
        const localPath = path.join(recordingsDir, filename);
        
        const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
        const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
        const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

        // Download audio and write to disk
        const audioResponse = await fetch(recordingUrl, {
          headers: {
            Authorization: authHeader
          }
        });
        if (audioResponse.ok) {
          const buffer = Buffer.from(await audioResponse.arrayBuffer());
          fs.writeFileSync(localPath, buffer);
          console.log(`[LOCAL STORAGE] Audio recording saved locally to: ${localPath}`);
        } else {
          console.error(`[LOCAL STORAGE] Failed to download Twilio audio: ${audioResponse.statusText}`);
        }
      } catch (err) {
        console.error("[LOCAL STORAGE] Error saving call audio locally:", err);
      }
    }

    // 1. Fetch Lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 2. Fetch Agent
    let agentId = userId;
    if (!agentId || agentId === "placeholder") {
      const firstUser = await prisma.user.findFirst();
      agentId = firstUser ? firstUser.id : "";
    }
    const agent = agentId ? await prisma.user.findUnique({ where: { id: agentId } }) : null;
    const agentName = agent ? agent.name : "Sales Advisor";

    // 3. Generate or transcribe conversation
    let conversation;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (openAiKey && recordingUrl) {
      try {
        conversation = await transcribeAndAnalyzeRecording(
          recordingUrl,
          openAiKey,
          lead.name,
          agentName,
          lang,
          isWebRTC
        );
      } catch (err: any) {
        console.error("OpenAI real transcription failed:", err);
        
        let errorMessage = "OpenAI Speech Transcription error.";
        if (err.message && err.message.includes("429")) {
          errorMessage = "OpenAI API Quota Exceeded (Billing Error 429). Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing";
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
      let errorMessage = "OpenAI API Key is missing. Please add OPENAI_API_KEY to your .env file.";
      if (!recordingUrl) {
        errorMessage = "No recording audio file found from Twilio.";
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

    // Print structured transcript turns to the terminal as requested
    if (conversation && conversation.transcript) {
      try {
        const turns = JSON.parse(conversation.transcript);
        if (Array.isArray(turns)) {
          console.log(`\n========================================`);
          console.log(`📞 OUTBOUND TELEPHONY CALL DIALOGUE TRANSCRIPT`);
          console.log(`========================================`);
          turns.forEach((turn: any) => {
            const speakerName = turn.speaker === "Agent" ? agentName : lead.name;
            console.log(`[TRANSCRIPT] ${speakerName}: ${turn.text}`);
          });
          console.log(`========================================\n`);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // 4. Check if call log already exists with this Twilio CallSid (stored in jobId)
    const existingCallLog = await prisma.callLog.findFirst({
      where: { jobId: callSid }
    });

    if (existingCallLog) {
      // Update existing call log with transcription results
      await prisma.callLog.update({
        where: { id: existingCallLog.id },
        data: {
          duration: recordingDurationSec || existingCallLog.duration,
          transcript: conversation.transcript,
          translatedText: conversation.translatedText,
          detectedVoiceLanguage: conversation.detectedVoiceLanguage,
          translatedLanguage: conversation.translatedLanguage,
          wordCount: conversation.wordCount,
          analysis: conversation.analysis,
          aiScore: conversation.aiScore,
          audioUrl: recordingUrl,
          notes: existingCallLog.notes || `Call recorded successfully. Audio URL: ${recordingUrl}`
        }
      });
      console.log(`Updated CallLog ${existingCallLog.id} with Twilio recording transcription.`);
    } else {
      // Create new CallLog if it doesn't exist yet
      await prisma.callLog.create({
        data: {
          jobId: callSid,
          leadId,
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
          notes: `Automatic logging from Twilio recording callback. Audio URL: ${recordingUrl}`
        }
      });
      console.log(`Created new CallLog from Twilio recording callback for CallSid: ${callSid}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Twilio Recording Callback Webhook Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process callback" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
