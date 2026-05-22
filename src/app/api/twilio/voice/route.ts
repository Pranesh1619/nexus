import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    let leadName = "Customer";

    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId }
      });
      if (lead) {
        leadName = lead.name;
      }
    }

    // Fetch active SIP configuration to dial the correct agent softphone URI
    const sipConfig = await prisma.sipTrunkConfig.findFirst({
      where: { isActive: true }
    });

    let dialLeg = `<Client>agent_web_client</Client>`;
    if (sipConfig && sipConfig.username && sipConfig.domain) {
      dialLeg = `<Sip>sip:${sipConfig.username}@${sipConfig.domain}</Sip>`;
    }

    const lang = searchParams.get("lang") || "English";

    // Define the automated system greetings for each language.
    // YOU CAN CHANGE THESE GREETING SENTENCES DIRECTLY BELOW:
    let greetingText = `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will transcribe it. Hang up when you are finished.`;
    let voiceActor = "Polly.Brian-Neural"; // Premium English voice
    let languageCode = "en-US";

    if (lang === "Spanish") {
      greetingText = `Hola ${leadName}. Bienvenido a la consola de ventas de Virpanix. Por favor hable después del tono y grabaremos su mensaje. Cuelgue cuando termine.`;
      voiceActor = "Polly.Lupe-Neural"; // Premium Spanish voice
      languageCode = "es-ES";
    } else if (lang === "Hindi") {
      greetingText = `नमस्ते ${leadName} जी। विरपैनिक्स सेल्स कंसोल में आपका स्वागत है। कृपया बीप के बाद अपना संदेश बोलें और हम इसे रिकॉर्ड करेंगे। पूरा होने पर फोन काट दें।`;
      voiceActor = "Polly.Aditi"; // Hindi voice
      languageCode = "hi-IN";
    } else if (lang === "French") {
      greetingText = `Bonjour ${leadName}. Bienvenue sur la console de vente Virpanix. Veuillez parler après le signal sonore et nous enregistrerons votre message. Raccrochez lorsque vous avez terminé.`;
      voiceActor = "Polly.Celine"; // French voice
      languageCode = "fr-FR";
    } else if (lang === "German") {
      greetingText = `Hallo ${leadName}. Willkommen bei der Virpanix-Verkaufskonsole. Bitte sprechen Sie Ihre Nachricht nach dem Signalton und wir werden sie aufzeichnen. Legen Sie auf, wenn Sie fertig sind.`;
      voiceActor = "Polly.Marlene"; // German voice
      languageCode = "de-DE";
    } else if (lang === "Tamil") {
      greetingText = `வணக்கம் ${leadName}. விர் பேனிக்ஸ் விற்பனை கன்சோலுக்கு உங்களை வரவேற்கிறோம். தயவுசெய்து பீப் ஒலிக்குப் பிறகு உங்கள் செய்தியைப் பேசுங்கள், நாங்கள் அதை பதிவு செய்வோம். நீங்கள் முடித்ததும் போனை தொங்கவிடவும்.`;
      voiceActor = "Google.ta-IN-Standard-D"; // Google standard female Tamil voice
      languageCode = "ta-IN"; // Tamil locale
    }

    // Return TwiML that greets the lead and lets them speak by using the Record tag.
    // This keeps the call active, plays a beep, and records whatever the user speaks.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceActor}" language="${languageCode}">${greetingText}</Say>
  <Record maxLength="60" playBeep="true" />
</Response>`;

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
