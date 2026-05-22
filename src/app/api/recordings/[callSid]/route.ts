import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callSid: string }> | { callSid: string } }
) {
  try {
    // Await params to handle Next.js dynamic routing safely
    const resolvedParams = await params;
    const { callSid } = resolvedParams;

    let audioBuffer: any = null;

    // 1. Try to serve the recording from local storage first for maximum speed and reliability
    try {
      const fs = require("fs");
      const path = require("path");
      const recordingsDir = path.join(process.cwd(), "public", "recordings");
      
      if (fs.existsSync(recordingsDir)) {
        const files = fs.readdirSync(recordingsDir);
        const match = files.find((f: string) => f.endsWith(`${callSid}.wav`));
        if (match) {
          const localPath = path.join(recordingsDir, match);
          if (fs.existsSync(localPath)) {
            console.log(`[Recording Proxy] Serving local audio file: ${localPath}`);
            audioBuffer = fs.readFileSync(localPath);
          }
        }
      }
    } catch (localErr) {
      console.warn("[Recording Proxy] Local lookup failed, falling back to Twilio:", localErr);
    }

    // 2. Fallback: Find the call log in the database and download from Twilio
    if (!audioBuffer) {
      const callLog = await prisma.callLog.findFirst({
        where: { jobId: callSid }
      });

      if (!callLog || !callLog.audioUrl) {
        return new Response("Call recording not found in database", { status: 404 });
      }

      const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
      const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

      // Fetch the recording with manual redirect follow to strip Auth headers for S3
      let response = await fetch(callLog.audioUrl, {
        headers: {
          Authorization: authHeader
        },
        redirect: "manual"
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location) {
          // Fetch redirected S3 URL WITHOUT Twilio's basic auth header
          console.log(`[Recording Proxy] Following redirect manually: ${location.split('?')[0]}`);
          response = await fetch(location);
        }
      }

      if (!response.ok) {
        return new Response(`Failed to fetch audio from Twilio: ${response.statusText}`, {
          status: response.status
        });
      }

      // Get the audio array buffer
      audioBuffer = await response.arrayBuffer();
    }

    // 3. Support HTTP Range requests to allow browser audio player to display duration and seek/scrub
    const audioLength = audioBuffer.byteLength || audioBuffer.length;
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : audioLength - 1;
      
      const chunksize = (end - start) + 1;
      const slicedBuffer = audioBuffer.slice(start, end + 1);

      return new Response(slicedBuffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${audioLength}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunksize),
          "Content-Type": "audio/wav",
          "Cache-Control": "public, max-age=31536000",
        }
      });
    } else {
      return new Response(audioBuffer, {
        status: 200,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": String(audioLength),
          "Content-Type": "audio/wav",
          "Cache-Control": "public, max-age=31536000",
        }
      });
    }
  } catch (error: any) {
    console.error("Recording proxy API error:", error);
    return new Response(error.message || "Internal Server Error", { status: 500 });
  }
}
