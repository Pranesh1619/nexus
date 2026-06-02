const fs = require("fs");
const path = require("path");

const envContent = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf-8");
let apiKey = "";
const lines = envContent.split(/\r?\n/);
for (const line of lines) {
  const match = line.match(/^\s*([\w.\-_]+)\s*=\s*["']?(.*?)["']?\s*$/);
  if (match) {
    const key = match[1];
    const val = match[2];
    if (key === "OPENAI_API_KEY" || key === "GROQ_API_KEY") {
      if (key === "OPENAI_API_KEY" && !apiKey.startsWith("gsk_")) {
        apiKey = val;
      } else if (key === "GROQ_API_KEY") {
        apiKey = val;
      }
    }
  }
}

const targetLanguage = "Tamil";
const leadName = "Pranesh S";
const agentName = "Super Admin";

// The leadText containing the Whisper transcription
const leadText = "வணக்கம், நான் வப்பில் தேனியிலிருந்து எப்படி போய் இருக்கிறேன் என்றால் எல்லாருக்கு என்னை அழைத்துவிட்டோய், அழைத்துவிட்டோய்.";
const staticAgentText = "வணக்கம் Pranesh S. விர் பேனிக்ஸ் விற்பனை கன்சோலுக்கு உங்களை வரவேற்கிறோம். தயவுசெய்து பீப் ஒலிக்குப் பிறகு உங்கள் செய்தியைப் பேசுங்கள், நாங்கள் அதை பதிவு செய்வோம். நீங்கள் முடித்ததும் போனை தொங்கவிடவும்.";
const staticAgentTranslation = "Welcome Pranesh S. We welcome you to the Virpanix Sales Console. Please speak your message after the beep, and we will record it. Hang up when you are finished.";

const prompt = `You are a CRM call analyzer. The phone call consists of:
1. An automated system greeting in language "${targetLanguage}":
   - Original Speech: "${staticAgentText}"
   - English Translation: "${staticAgentTranslation}"
2. A recording of the Lead's speech in language "${targetLanguage}":
   - Original Speech: "${leadText}"

Please perform the following operations:
1. Translate the Lead's speech into fluent English. Save this translation under the "translatedLeadText" key.
   - PHONETIC & CONTEXT CORRECTION: Whisper transcriptions of regional languages often contain garbled words, homophones, or phonetic transcription errors due to audio quality (e.g. transcribing "மாப்பிள்ளை" as "வப்பில்" or "கூப்பிட்டாய்/அழைத்தாய்" as "அழைத்துவிட்டோய்"). You MUST use the conversational context of the call to correct these minor transcription anomalies so the English translation is accurate, natural, and logical.
2. Transliterate/convert the Lead's speech to its proper native script under the "nativeLeadText" key:
   - If the Lead's speech is in a foreign language (Tamil, Hindi, Spanish, French, German) but transcribed in Romanized/Latin script (e.g. "kaise ho"), you MUST convert/transliterate it into its proper native script (e.g. Hindi Devanagari "कैसे हो").
   - If the Lead's speech contains minor phonetic spelling errors or garbled words, correct them to their proper native words (e.g., correcting "வப்பில்" to "மாப்பிள்ளை").
   - Do NOT translate this key to English; it must represent the spoken words in the native language's script.
3. Detect the primary language of the Lead's speech and populate the "detectedVoiceLanguage" key (e.g., "Tamil", "Hindi", "English", "Spanish", etc.).
4. Write a professional CRM call analysis summarizing the discussion, client objections, and proposed follow-up steps.
5. Calculate a quality score (0 to 100) representing the lead's level of interest or business qualification.

Return ONLY a raw JSON object (do not wrap in markdown fences like \`\`\`json) matching the following TypeScript interface:
{
  "detectedVoiceLanguage": string,
  "translatedLeadText": string, // English translation of the Lead's speech
  "nativeLeadText": string, // Lead's speech in its proper native script
  "analysis": string,
  "aiScore": number
}`;

const isGroq = apiKey.startsWith("gsk_");
const chatEndpoint = isGroq
  ? "https://api.groq.com/openai/v1/chat/completions"
  : "https://api.openai.com/v1/chat/completions";
const chatModel = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

async function run() {
  const response = await fetch(chatEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: chatModel,
      messages: [
        { role: "system", content: "You are a database integration tool. You only return pure, valid JSON objects. Do not include any explanations, notes, or conversational text outside of the JSON block." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  console.log("LLM Response Content with Correction instructions:");
  console.log(data.choices[0].message.content);
}

run().catch(console.error);
