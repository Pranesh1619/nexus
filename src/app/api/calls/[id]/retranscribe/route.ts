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

  const { startOfflineRetranscription } = require("@/lib/transcription");
  startOfflineRetranscription(id);

  return NextResponse.json({ success: true, status: "started" });
}
