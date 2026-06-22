import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    let leadName = "Customer";

    let callerPhone = searchParams.get("From") || "";
    try {
      const formData = await request.clone().formData();
      if (!callerPhone) {
        callerPhone = (formData.get("From") as string) || (formData.get("Caller") as string) || "";
      }
    } catch (e) {
      // Ignore
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
              name: `Inbound Call (${callerPhone})`,
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
          console.log(`[INBOUND Voice Route] Created new Lead for caller: ${callerPhone}`);
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

    // Define the automated system greetings for each language.
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

    const recordingCallbackUrl = `${hostUrl}/api/twilio/recording-callback?lang=${lang}${targetLeadId ? `&amp;leadId=${targetLeadId}` : ""}`;

    let twiml = "";
    if (agentPhone) {
      let formattedAgentPhone = agentPhone.replace(/[^\d+]/g, "");
      if (!formattedAgentPhone.startsWith("+")) {
        if (formattedAgentPhone.startsWith("91") && formattedAgentPhone.length === 12) {
          formattedAgentPhone = "+" + formattedAgentPhone;
        } else {
          formattedAgentPhone = "+91" + formattedAgentPhone;
        }
      }

      console.log(`[INBOUND Voice Route] Forwarding call from ${callerPhone || "unknown"} to Agent: ${formattedAgentPhone}`);

      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceActor}" language="${languageCode}">Connecting you to your dedicated agent. Please hold.</Say>
  <Dial 
    record="record-from-answer" 
    recordingStatusCallback="${recordingCallbackUrl}"
  >
    <Number>${formattedAgentPhone}</Number>
  </Dial>
</Response>`;
    } else {
      console.log(`[INBOUND Voice Route] No agent phone number available. Falling back to Voicemail recording.`);
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceActor}" language="${languageCode}">${greetingText}</Say>
  <Record maxLength="60" playBeep="true" recordingStatusCallback="${recordingCallbackUrl}" />
</Response>`;
    }

    return new Response(twiml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error("Twilio TwiML Voice Error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connection error occurred.</Say></Response>`, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
