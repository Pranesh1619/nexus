import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { transcribeAndAnalyzeRecording, transcriptionLogStorage, retranscribeJobs } from "@/lib/transcription";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = retranscribeJobs.get(id);
  if (!job) {
    return NextResponse.json({ status: "idle", logs: [], error: null, duration: null });
  }
  return NextResponse.json(job);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = retranscribeJobs.get(id);
  if (job && job.status === "running") {
    return NextResponse.json({ success: false, message: "Retranscription is already running in the background." });
  }

  // Initialize/reset job state
  const currentJob: {
    status: "running" | "done" | "error";
    logs: string[];
    error?: string;
    duration?: string;
  } = {
    status: "running",
    logs: [`[System] Initiating offline retranscription for call ID: ${id}...`],
  };
  retranscribeJobs.set(id, currentJob);

  // Start background processing - DO NOT await it so we return immediately
  (async () => {
    try {
      const startTime = Date.now();
      
      // Wrap transcription in AsyncLocalStorage to capture console.logs
      await transcriptionLogStorage.run(
        (msg) => {
          currentJob.logs.push(msg);
        },
        async () => {
          try {
            // 1. Fetch Call log
            const call = await prisma.callLog.findUnique({
              where: { id },
              include: { lead: true, user: true },
            });

            if (!call) {
              currentJob.status = "error";
              currentJob.error = "Call log not found in database.";
              currentJob.logs.push(`[ERROR] ${currentJob.error}`);
              return;
            }

            if (!call.audioUrl) {
              currentJob.status = "error";
              currentJob.error = "This call has no audio recording URL.";
              currentJob.logs.push(`[ERROR] ${currentJob.error}`);
              return;
            }

            currentJob.logs.push(`[System] Fetching audio from: ${call.audioUrl}`);

            // 2. Invoke transcription
            const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
            const leadName = call.lead?.name || "Client";
            const agentName = call.user?.name || "Sales Rep";
            const targetLanguage = call.detectedVoiceLanguage || "Tamil";
            
            const result = await transcribeAndAnalyzeRecording(
              call.audioUrl,
              apiKey,
              leadName,
              agentName,
              targetLanguage,
              false // isWebRTC
            );

            // 3. Update the database
            currentJob.logs.push("[System] Updating call log in database with new transcription...");
            const updated = await prisma.callLog.update({
              where: { id },
              data: {
                transcript: result.transcript,
                translatedText: result.translatedText,
                detectedVoiceLanguage: result.detectedVoiceLanguage,
                translatedLanguage: result.translatedLanguage,
                wordCount: result.wordCount,
                analysis: result.analysis,
                aiScore: result.aiScore,
                notes: `Retranscribed offline using local Whisper model. Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
              }
            });

            const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
            currentJob.status = "done";
            currentJob.duration = durationSec;
            currentJob.logs.push(`[System] Retranscription complete in ${durationSec}s!`);
          } catch (err: any) {
            console.error("Retranscribe background task error:", err);
            currentJob.status = "error";
            currentJob.error = err.message || "An unexpected error occurred during retranscription.";
            currentJob.logs.push(`[ERROR] ${currentJob.error}`);
          }
        }
      );
    } catch (err: any) {
      console.error("Failed to run transcriptionLogStorage:", err);
      currentJob.status = "error";
      currentJob.error = err.message || "Failed to initialize log storage.";
      currentJob.logs.push(`[ERROR] ${currentJob.error}`);
    }
  })();

  return NextResponse.json({ success: true, status: "started" });
}
