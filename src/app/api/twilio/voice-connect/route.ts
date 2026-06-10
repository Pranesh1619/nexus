import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    console.log("[Voice Connect] Webhook received parameters:", Array.from(formData.entries()));

    let to = formData.get("destPhone") as string || formData.get("To") as string || "";
    if (to.startsWith("AP")) {
      to = "";
    }
    const leadId = formData.get("leadId") as string || "";
    const lang = formData.get("lang") as string || "English";
    const userId = formData.get("userId") as string || "";

    if (!to) {
      console.warn("[Voice Connect] No destination phone number provided.");
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: No destination number provided.</Say></Response>`, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    const hostUrl = process.env.APP_URL || "http://localhost:3000";

    // Fetch active callerId from SIP Trunk configuration in the database
    const sipConfig = await prisma.sipTrunkConfig.findFirst({
      where: { isActive: true }
    });
    
    const callerId = sipConfig?.callerId || process.env.TWILIO_NUMBER || formData.get("From") || "";

    console.log(`[Voice Connect] Routing call from ${callerId} to customer ${to}. Bridge recording enabled.`);

    // Return TwiML with <Dial> to connect WebRTC stream to PSTN/SIP phone number
    // We enable dual-channel call recording to capture both agent and customer speech.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial 
    callerId="${callerId}" 
    record="record-from-answer-dual" 
    recordingStatusCallback="${hostUrl}/api/twilio/recording-callback?leadId=${leadId}&amp;lang=${lang}&amp;userId=${userId}&amp;callType=webrtc"
  >
    <Number>${to}</Number>
  </Dial>
</Response>`;

    console.log("[Voice Connect] Dispatched TwiML:\n", twiml);

    return new Response(twiml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error: any) {
    console.error("[Voice Connect] Webhook Error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice connect error occurred.</Say></Response>`, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
