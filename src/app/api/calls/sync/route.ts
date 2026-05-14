import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const records = Array.isArray(body) ? body : [body];

    const results = [];

    // Find a default sales user to assign calls/leads to if needed
    let user = await prisma.user.findFirst({
      where: { role: "SALES" }
    });
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      return NextResponse.json({ error: "No user found in system to assign call logs" }, { status: 500 });
    }

    for (const record of records) {
      const jobId = record.job_id || record.jobId || null;
      const callerPhone = record.caller_phone_number || record.callerPhone || "";
      const receiverPhone = record.receiver_phone_number || record.receiverPhone || "";
      const detectedVoiceLanguage = record.detected_voice_language || record.detectedVoiceLanguage || "Unknown";
      const translatedLanguage = record.translated_language || record.translatedLanguage || "English";
      const translatedText = record.translated_text || record.translatedText || "";
      const durationSeconds = record.duration_seconds !== undefined ? Number(record.duration_seconds) : (record.duration !== undefined ? Number(record.duration) : 0);
      const wordCount = record.word_count !== undefined ? Number(record.word_count) : 0;
      const createdAtStr = record.created_at || record.createdAt || new Date().toISOString();

      const parsedDate = !isNaN(Date.parse(createdAtStr)) ? new Date(createdAtStr) : new Date();

      // Determine Lead by checking phone numbers
      const phoneToMatch = callerPhone || receiverPhone || "0000000000";

      let lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { phone: callerPhone || "___" },
            { phone: receiverPhone || "___" }
          ]
        }
      });

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            name: `Caller ${phoneToMatch}`,
            phone: phoneToMatch,
            status: "NEW",
            source: "COLD_CALL",
            assignedTo: user.id
          }
        });
      }

      // Check if call log already exists by jobId
      let existingCall = null;
      if (jobId) {
        existingCall = await prisma.callLog.findFirst({
          where: { jobId }
        });
      }

      if (existingCall) {
        // Update
        const updated = await prisma.callLog.update({
          where: { id: existingCall.id },
          data: {
            callerPhone,
            receiverPhone,
            duration: durationSeconds,
            transcript: translatedText,
            translatedText,
            detectedVoiceLanguage,
            translatedLanguage,
            wordCount,
          }
        });
        results.push(updated);
      } else {
        // Create
        const created = await prisma.callLog.create({
          data: {
            jobId,
            callerPhone,
            receiverPhone,
            duration: durationSeconds,
            status: durationSeconds > 0 ? "CONNECTED" : "MISSED",
            stage: "Connected",
            transcript: translatedText,
            translatedText,
            detectedVoiceLanguage,
            translatedLanguage,
            wordCount,
            notes: `Auto-synced call from external system (${detectedVoiceLanguage} -> ${translatedLanguage}).`,
            aiScore: 85,
            leadId: lead.id,
            userId: user.id,
            startTime: parsedDate,
          }
        });
        results.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} call log(s).`,
      data: results
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error syncing calls:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const logs = await prisma.callLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        lead: true,
        user: true,
      }
    });

    return NextResponse.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
