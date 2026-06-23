import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let formData = null;
    
    try {
      if (request.method === "POST") {
        formData = await request.formData();
      }
    } catch (e) {
      console.warn("[Plivo Voice Connect] Could not parse form data:", e);
    }

    let to = searchParams.get("destPhone") || formData?.get("destPhone") as string || formData?.get("To") as string || "";
    const leadId = searchParams.get("leadId") || formData?.get("leadId") as string || "";
    const lang = searchParams.get("lang") || formData?.get("lang") as string || "English";
    const userId = searchParams.get("userId") || formData?.get("userId") as string || "";
    const callSid = searchParams.get("callSid") || formData?.get("callSid") as string || "";

    if (!to) {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Error: No destination number provided.</Speak></Response>`, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    const actualCallUuid = formData?.get("CallUUID") as string || formData?.get("call_uuid") as string || "";
    console.log(`[Plivo Voice Connect] Routing call to customer ${to}. request_uuid: ${callSid}, actual CallUUID: ${actualCallUuid}`);

    if (callSid && actualCallUuid) {
      try {
        const placeholderLog = await prisma.callLog.findFirst({
          where: { jobId: callSid }
        });
        if (placeholderLog) {
          await prisma.callLog.update({
            where: { id: placeholderLog.id },
            data: {
              jobId: actualCallUuid,
              notes: `[RequestUUID: ${callSid}] ${placeholderLog.notes || ""}`.trim()
            }
          });
          console.log(`[Plivo Voice Connect] Successfully mapped request_uuid ${callSid} to CallUUID ${actualCallUuid} in database.`);
        }
      } catch (dbErr) {
        console.error("[Plivo Voice Connect] Database mapping error:", dbErr);
      }
    }

    const hostHeader = request.headers.get("host") || request.headers.get("x-forwarded-host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const hostUrl = hostHeader ? `${protocol}://${hostHeader}` : (process.env.APP_URL || "http://localhost:3000");

    const sipConfig = await prisma.sipTrunkConfig.findFirst({
      where: { isActive: true }
    });
    
    const callerId = sipConfig?.callerId || "";

    const recordingCallbackUrl = `${hostUrl}/api/plivo/recording-callback?leadId=${leadId}&amp;lang=${lang}&amp;userId=${userId}&amp;callSid=${actualCallUuid || callSid}&amp;callType=webrtc`;

    const plivoXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record callbackUrl="${recordingCallbackUrl}" callbackMethod="POST" startOnDialAnswer="true" redirect="false" fileFormat="mp3" />
  <Dial callerId="${callerId}">
    <Number>${to}</Number>
  </Dial>
</Response>`;

    return new Response(plivoXml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error: any) {
    console.error("[Plivo Voice Connect] Webhook Error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Voice connect error occurred.</Speak></Response>`, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
