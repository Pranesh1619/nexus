const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Copy findBoundarySplitIndex and cleanGreetingPhrases exactly from e:\Projects\Next-JS\bpo\src\lib\transcription.ts
function findBoundarySplitIndex(rawTranscript) {
  const boundaryPhrases = [
    "hang up when you are finished",
    "cuelgue cuando termine",
    "पूरा होने पर फोन काट दें",
    "raccrochez lorsque vous avez terminé",
    "raccrochez lorsque vous avez termine",
    "legen sie auf wenn sie fertig sind",
    "முடித்ததும் போனை தொங்கவிடவும்",
    "போனை தொங்கவிடவும்",
    "தொங்கவிடவும்"
  ];

  for (const phrase of boundaryPhrases) {
    const words = phrase.split(/\s+/);
    const regexStr = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join("[^a-zA-Z0-9\\u0900-\\u097F\\u0B80-\\u0BFF]+");
    const regex = new RegExp(regexStr, "i");
    const match = rawTranscript.match(regex);
    if (match && match.index !== undefined) {
      return { phrase, index: match.index, boundaryLength: match[0].length };
    }
  }

  return null;
}

function cleanGreetingPhrases(rawTranscript, leadName) {
  let cleaned = rawTranscript;

  const patterns = [
    // Trial warnings / system messages
    /you\s+can\s+remove\s+this\s+message\s+at\s+any\s+time/gi,
    /you\s+have\s+a\s+trial\s+account/gi,
    /please\s+press\s+any\s+key\s+to\s+execute\s+your\s+twiml/gi,
    /\b(signal)\b/gi,

    // English greetings (flexible names & spelling variants)
    /hello\s+.*?\s*welcome\s+to\s+the\s+(?:vir|vi|virpe|vipa)nix\s+sales\s+console/gi,
    /welcome\s+to\s+the\s+(?:vir|vi|virpe|vipa)nix\s+sales\s+console/gi,
    /welcome\s+to\s+(?:vir|vi|virpe|vipa)nix/gi,
    /hello\s+.*?\s*welcome/gi,
    /hello\s+customer/gi,
    /please\s+speak\s+your\s+message\s+after\s+the\s+beep/gi,
    /please\s+tell\s+me\s+about\s+your\s+message/gi,
    /we\s+will\s+record\s+it/gi,
    /and\s+we\s+will\s+transcribe\s+it/gi,
    /and\s+we\s+will\s+record\s+it/gi,
    /hang\s+up\s+when\s+you\s+are\s+finished/gi,
    /you\s+can\s+hang\s+up\s+the\s+phone\s+when\s+you\s+are\s+finished/gi,

    // Tamil greetings (flexible names & spelling variants)
    /வணக்கம்\s+.*?\s*விர்\s+பேனிக்ஸ்\s+விற்பனை\s+கன்சோலுக்கு\s+உங்களை\s+வரவேற்கிறோம்/g,
    /வணக்கம்\s+.*?\s*விர்பெனிக்ஸ்\s+கன்சோல்\s+உங்களை\s+வரவேற்கிறோம்/g,
    /வணக்கம்\s+.*?\s*உங்களை\s+வரவேற்கிறோம்/g,
    /விர்\s+பேனிக்ஸ்\s+விற்பனை\s+கன்சோலுக்கு\s+உங்களை\s+வரவேற்கிறோம்/g,
    /விர்பெனிக்ஸ்\s+கன்சோல்\s+உங்களை\s+வரவேற்கிறோம்/g,
    /விர்\s+பேனிக்ஸ்\s+விற்பனை\s+கன்சோலுக்கு/g,
    /உங்களை\s+வரவேற்கிறோம்/g,
    /தயவுசெய்து\s+பீப்\s+ஒலிக்குப்\s+பிறகு\s+உங்கள்\s+செய்தியைப்\s+பேசுங்கள்/g,
    /தயவுசெய்து\s+பீப்\s+ஒலிக்குப்\s+பிறகு/g,
    /தயவு\s+செய்து\s+பீப்\s+ஒலிக்கு\s+பிறகு/g,
    /பீப்\s+ஒலிக்குப்\s+பிறகு/g,
    /பீப்\s+ஒலிக்கு\s+பிறகு/g,
    /தயவு\s+செய்து\s+பி[.\s]+போலிக்கு\s+பெருகு\s+உங்கள்\s+செய்தியை\s+பேசுங்கள்/g,
    /தயவு\s+செய்து\s+பி[.\s]+போலிகு\s+பெருகு\s+உங்கள்\s+செய்தியை\s+பேசுங்கள்/g,
    /தயவு\s+செய்து\s+பி[.\s]+போலிக்கு/g,
    /தயவு\s+செய்து\s+பி[.\s]+போலிகு/g,
    /பெருகு\s+உங்கள்\s+செய்தியை\s+பேசுங்கள்/g,
    /உங்கள்\s+செய்தியைப்\s+பேசுங்கள்/g,
    /செய்தியைப்\s+பேசுங்கள்/g,
    /நாங்கள்\s+அதை\s+பதிவு\s+செய்வோம்/g,
    /பதிவு\s+செய்வோம்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனை\s+தொங்கவிடவும்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனி\s+தொங்கவிடவும்/g,
    /போனை\s+தொங்கவிடவும்/g,
    /போனி\s+தொங்கவிடவும்/g,
    /தொங்கவிடவும்/g,
    /தொங்க\s+விடவும்/g,
    /தொங்கவிடவும்/g,
    /தொங்கவிடவும்/gi
  ];

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

async function run() {
  const log = await prisma.callLog.findUnique({
    where: { id: "cmptu8w3i0003tzvkowwyeoia" }
  });

  if (!log) {
    console.error("Call log not found");
    return;
  }

  // Retrieve the full text from the Lead turn (which has the greeting in the database)
  const turns = JSON.parse(log.transcript);
  const leadTurn = turns.find(t => t.speaker === "Lead");
  const rawText = leadTurn ? leadTurn.text : "";

  console.log("1. Original Raw Text:", rawText);

  // Run the boundary split
  let processedText = rawText;
  const boundary = findBoundarySplitIndex(processedText);
  if (boundary) {
    const splitPoint = boundary.index + boundary.boundaryLength;
    console.log(`2. Located greeting boundary: phrase="${boundary.phrase}" at index=${boundary.index}. Slicing off.`);
    processedText = processedText.substring(splitPoint).trim();
  } else {
    console.log("2. No boundary found!");
  }

  console.log("3. Text after boundary split:", processedText);

  // Run the phrase-based cleaning
  const fullyCleaned = cleanGreetingPhrases(processedText, "Pranesh S");
  console.log("4. Text after phrase-based cleaning:", fullyCleaned);
}

run().catch(console.error).finally(() => prisma.$disconnect());
