import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    let leadName = "Customer";

    let callerPhone = searchParams.get("From") || "";
    let callSid = searchParams.get("callSid") || "";
    let requestUuid = "";
    let actualCallUuid = "";

    try {
      const formData = await request.clone().formData();
      if (!callerPhone) {
        callerPhone = (formData.get("From") as string) || (formData.get("Caller") as string) || "";
      }
      requestUuid = (formData.get("RequestUUID") as string) || "";
      actualCallUuid = (formData.get("CallUUID") as string) || "";
      
      if (!callSid) {
        callSid = (formData.get("ALegRequestUUID") as string) || requestUuid || actualCallUuid || "";
      }
    } catch (e) {
      // Ignore
    }

    // Try to map requestUuid to actualCallUuid in CallLog if a placeholder was created
    if (requestUuid && actualCallUuid && requestUuid !== actualCallUuid) {
      try {
        const placeholderLog = await prisma.callLog.findFirst({
          where: { jobId: requestUuid }
        });
        if (placeholderLog) {
          await prisma.callLog.update({
            where: { id: placeholderLog.id },
            data: {
              jobId: actualCallUuid,
              notes: `[RequestUUID: ${requestUuid}] ${placeholderLog.notes || ""}`.trim()
            }
          });
          console.log(`[Plivo Voice Route] Successfully mapped outbound request_uuid ${requestUuid} to CallUUID ${actualCallUuid} in database.`);
        }
      } catch (dbErr) {
        console.error("[Plivo Voice Route] Database mapping error:", dbErr);
      }
    }

    const hostHeader = request.headers.get("host") || "";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const hostUrl = hostHeader ? `${protocol}://${hostHeader}` : (process.env.APP_URL || "http://localhost:3000");

    const lang = searchParams.get("lang") || "English";

    let targetLeadId = leadId;
    let agentPhone = "";

    if (targetLeadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: targetLeadId },
        include: { salesPerson: true }
      });
      if (lead) {
        leadName = lead.name;
        if (lead.salesPerson?.phone) {
          agentPhone = lead.salesPerson.phone;
        }
      }
    } else if (callerPhone) {
      const cleanFrom = callerPhone.replace(/\D/g, "");
      const last10Digits = cleanFrom.slice(-10);

      if (last10Digits.length >= 7) {
        const allLeads = await prisma.lead.findMany({
          include: {
            salesPerson: true,
            calls: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        });
        
        let matchedLead = allLeads.find(l => {
          const cleanLeadPhone = l.phone.replace(/\D/g, "");
          return cleanLeadPhone.endsWith(last10Digits) || cleanFrom.endsWith(cleanLeadPhone.slice(-10));
        });

        if (!matchedLead) {
          matchedLead = await prisma.lead.create({
            data: {
              name: `New User (${callerPhone})`,
              phone: callerPhone,
              status: "NEW",
              source: "INBOUND_CALL"
            },
            include: {
              salesPerson: true,
              calls: {
                orderBy: { createdAt: "desc" },
                take: 1
              }
            }
          });
          console.log(`[INBOUND Plivo Voice Route] Created new Lead for caller: ${callerPhone}`);
        }

        targetLeadId = matchedLead.id;
        leadName = matchedLead.name;

        if (matchedLead.salesPerson?.phone) {
          agentPhone = matchedLead.salesPerson.phone;
        } else if (matchedLead.calls.length > 0) {
          const lastCall = matchedLead.calls[0];
          const lastUser = await prisma.user.findUnique({
            where: { id: lastCall.userId }
          });
          if (lastUser?.phone) {
            agentPhone = lastUser.phone;
          }
        }
      }
    }

    if (!agentPhone) {
      const defaultUser = await prisma.user.findFirst({
        where: { phone: { not: null } }
      });
      if (defaultUser?.phone) {
        agentPhone = defaultUser.phone;
      }
    }

    // Create an initial placeholder call log for the inbound call immediately so it shows up in history
    if (targetLeadId && (actualCallUuid || callSid || requestUuid)) {
      try {
        let assignedAgentId = "";
        const leadObj = await prisma.lead.findUnique({
          where: { id: targetLeadId }
        });
        if (leadObj?.assignedTo) {
          assignedAgentId = leadObj.assignedTo;
        } else {
          const firstUser = await prisma.user.findFirst();
          if (firstUser) assignedAgentId = firstUser.id;
        }

        // Check if log already exists
        const existingLog = await prisma.callLog.findFirst({
          where: {
            OR: [
              { jobId: actualCallUuid || callSid || requestUuid },
              { jobId: requestUuid ? requestUuid : undefined }
            ]
          }
        });

        if (!existingLog && assignedAgentId) {
          await prisma.callLog.create({
            data: {
              jobId: actualCallUuid || callSid || requestUuid,
              leadId: targetLeadId,
              userId: assignedAgentId,
              duration: 0,
              status: "CONNECTED",
              stage: "Connected",
              callerPhone: callerPhone || null,
              receiverPhone: agentPhone || null,
              transcript: JSON.stringify([
                {
                  speaker: "Lead",
                  time: "00:00",
                  text: `Recording is being processed by Plivo. The transcript and analysis will appear here shortly.`,
                  translation: `Recording is being processed by Plivo. The transcript and analysis will appear here shortly.`
                }
              ]),
              translatedText: `Recording is being processed by Plivo. The transcript and analysis will appear here shortly.`,
              analysis: `Waiting for Plivo audio recording to compile and transcribe...`,
              notes: `Inbound Call initialized. [RequestUUID: ${requestUuid || ""}]`.trim()
            }
          });
          console.log(`[INBOUND Plivo Voice Route] Created initial placeholder CallLog for inbound call.`);
        }
      } catch (dbErr) {
        console.error("[INBOUND Plivo Voice Route] Database log creation error:", dbErr);
      }
    }

    let greetingText = `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will transcribe it. Hang up when you are finished.`;
    let voiceActor = "Polly.Brian-Neural";
    let languageCode = "en-US";

    if (lang === "Spanish") {
      greetingText = `Hola ${leadName}. Bienvenido a la consola de ventas de Virpanix. Por favor hable después del tono y grabaremos su mensaje. Cuelgue cuando termine.`;
      voiceActor = "Polly.Lupe-Neural";
      languageCode = "es-ES";
    } else if (lang === "Hindi") {
      greetingText = `नमस्ते ${leadName} जी। विरपैनिक्स सेल्स कंसोल में आपका स्वागत है। कृपया बीप के बाद अपना संदेश बोलें और हम इसे रिकॉर्ड करेंगे। पूरा होने पर फोन काट दें।`;
      voiceActor = "Polly.Aditi";
      languageCode = "hi-IN";
    } else if (lang === "French") {
      greetingText = `Bonjour ${leadName}. Bienvenue sur la console de vente Virpanix. Veuillez parler après le signal sonore et nous enregistrerons votre message. Raccrochez lorsque vous avez terminé.`;
      voiceActor = "Polly.Celine";
      languageCode = "fr-FR";
    } else if (lang === "German") {
      greetingText = `Hallo ${leadName}. Willkommen bei der Virpanix-Verkaufskonsole. Bitte sprechen Sie Ihre Nachricht nach dem Signalton und wir werden sie aufzeichnen. Legen Sie auf, wenn Sie fertig sind.`;
      voiceActor = "Polly.Marlene";
      languageCode = "de-DE";
    } else if (lang === "Tamil") {
      greetingText = `வணக்கம் ${leadName}. விர் பேனிக்ஸ் விற்பனை கன்சோலுக்கு உங்களை வரவேற்கிறோம். தயவுசெய்து பீப் ஒலிக்குப் பிறகு உங்கள் செய்தியைப் பேசுங்கள், நாங்கள் அதை பதிவு செய்வோம். நீங்கள் முடித்ததும் போனை தொங்கவிடவும்.`;
      voiceActor = "Google.ta-IN-Standard-D";
      languageCode = "ta-IN";
    }

    const finalCallSid = actualCallUuid || callSid || requestUuid;
    const recordingCallbackUrl = `${hostUrl}/api/plivo/recording-callback?lang=${lang}${targetLeadId ? `&amp;leadId=${targetLeadId}` : ""}${finalCallSid ? `&amp;callSid=${finalCallSid}` : ""}`;

    let plivoXml = "";
    if (agentPhone) {
      let formattedAgentPhone = agentPhone.replace(/[^\d+]/g, "");
      if (!formattedAgentPhone.startsWith("+")) {
        if (formattedAgentPhone.startsWith("91") && formattedAgentPhone.length === 12) {
          formattedAgentPhone = "+" + formattedAgentPhone;
        } else {
          formattedAgentPhone = "+91" + formattedAgentPhone;
        }
      }

      console.log(`[INBOUND Plivo Voice Route] Forwarding call to Agent: ${formattedAgentPhone}`);

      plivoXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record callbackUrl="${recordingCallbackUrl}" callbackMethod="POST" startOnDialAnswer="true" redirect="false" fileFormat="mp3" />
  <Speak voice="${voiceActor}" language="${languageCode}">Connecting you to your dedicated agent. Please hold.</Speak>
  <Dial>
    <Number>${formattedAgentPhone}</Number>
  </Dial>
</Response>`;
    } else {
      console.log(`[INBOUND Plivo Voice Route] No agent phone number available. Falling back to Voicemail recording.`);
      plivoXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="${voiceActor}" language="${languageCode}">${greetingText}</Speak>
  <Record maxLength="60" playBeep="true" callbackUrl="${recordingCallbackUrl}" callbackMethod="POST" fileFormat="mp3" />
</Response>`;
    }

    return new Response(plivoXml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error("Plivo XML Voice Error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Connection error occurred.</Speak></Response>`, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
