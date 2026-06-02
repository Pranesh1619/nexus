const fs = require("fs");
const path = require("path");

async function test() {
  const filePath = path.join(process.cwd(), "public", "recordings", "2026-05-26_10-27-41_CA3392ec77983e47f63b64ec932f4b39b6.wav");
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || "YOUR_GROQ_API_KEY_HERE";
  const fileBuffer = fs.readFileSync(filePath);
  const fileBlob = new Blob([fileBuffer], { type: "audio/wav" });

  const whisperEndpoint = "https://api.groq.com/openai/v1/audio/transcriptions";
  const whisperModel = "whisper-large-v3";

  console.log("Submitting audio to Groq Whisper...");
  const formData = new FormData();
  formData.append("file", fileBlob, "call_recording.wav");
  formData.append("model", whisperModel);
  // No language or prompt to see raw output!

  const response = await fetch(whisperEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Error from Groq:", text);
    return;
  }

  const data = await response.json();
  console.log("Raw transcription:", data);
}

test();
