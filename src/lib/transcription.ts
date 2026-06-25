import { AsyncLocalStorage } from "async_hooks";

export const transcriptionLogStorage = new AsyncLocalStorage<(msg: string) => void>();

const globalForJobs = globalThis as unknown as {
  retranscribeJobs?: Map<string, {
    status: "running" | "done" | "error";
    logs: string[];
    error?: string;
    duration?: string;
  }>;
};

if (!globalForJobs.retranscribeJobs) {
  globalForJobs.retranscribeJobs = new Map();
}

export const retranscribeJobs = globalForJobs.retranscribeJobs;

// Intercept console.log and route to transcriptionLogStorage if active
const originalLog = console.log;

console.log = (...args: any[]) => {
  originalLog(...args);
  const onProgress = transcriptionLogStorage.getStore();
  if (onProgress) {
    onProgress(args.join(" "));
  }
};
import { DialogueTurn, ConversationResult } from "./conversation_mock";

// Conversation template datasets for different stages and languages
const DIALOGUES_DATA: Record<
  string, // Language
  Record<
    string, // Stage group: "positive" (Interested, Qualified, Closed), "neutral" (Enquiry, Engaged, Connected), "negative" (Not Interested)
    {
      turns: (leadName: string, companyName: string, agentName: string) => DialogueTurn[];
      analysis: (leadName: string, companyName: string) => string;
      aiScore: number;
    }
  >
> = {
  English: {
    positive: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with ${leadName}?`, translation: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:08", text: `Yes, this is ${leadName} speaking. What is this regarding?`, translation: `Yes, this is ${leadName} speaking. What is this regarding?` },
        { speaker: "Agent", time: "00:15", text: `Hi ${leadName}, I'm calling from Virpa. We help companies like ${companyName || "yours"} scale support operations with our managed agent services. I wanted to see if you are optimizing your customer support this quarter.`, translation: `Hi ${leadName}, I'm calling from Virpa. We help companies like ${companyName || "yours"} scale support operations with our managed agent services. I wanted to see if you are optimizing your customer support this quarter.` },
        { speaker: "Lead", time: "00:26", text: `Actually, that's timely. We've been experiencing a high ticket volume at ${companyName || "our firm"} lately and are looking at outsourcing options. Can you share details about your team and pricing?`, translation: `Actually, that's timely. We've been experiencing a high ticket volume at ${companyName || "our firm"} lately and are looking at outsourcing options. Can you share details about your team and pricing?` },
        { speaker: "Agent", time: "00:38", text: `Absolutely! We provide 24/7 SLA-backed agents. I can arrange a demo next Tuesday to share our pricing plans and case studies. Would that work?`, translation: `Absolutely! We provide 24/7 SLA-backed agents. I can arrange a demo next Tuesday to share our pricing plans and case studies. Would that work?` },
        { speaker: "Lead", time: "00:48", text: `Yes, that sounds perfect. Let's do Tuesday at 10 AM. Send me the meeting invite over email.`, translation: `Yes, that sounds perfect. Let's do Tuesday at 10 AM. Send me the meeting invite over email.` }
      ],
      analysis: (leadName, companyName) => `Call with ${leadName} from ${companyName || "independent firm"} was highly successful. The lead showed direct interest in outsourcing customer support due to high ticket volumes. Scheduled a followup demo next Tuesday at 10 AM.`,
      aiScore: 92
    },
    neutral: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hello, this is ${agentName} from Virpa Support. How can I assist you today?`, translation: `Hello, this is ${agentName} from Virpa Support. How can I assist you today?` },
        { speaker: "Lead", time: "00:07", text: `Hi, I was looking at your website and had some questions about your multi-language support. Do you support French and Spanish?`, translation: `Hi, I was looking at your website and had some questions about your multi-language support. Do you support French and Spanish?` },
        { speaker: "Agent", time: "00:15", text: `Yes, we do! We have native speakers for Spanish, French, German, and Hindi. How large is the team you're planning to support?`, translation: `Yes, we do! We have native speakers for Spanish, French, German, and Hindi. How large is the team you're planning to support?` },
        { speaker: "Lead", time: "00:23", text: `We are quite small right now, maybe just 2 or 3 agents needed. I need to check our budget first and discuss with our manager.`, translation: `We are quite small right now, maybe just 2 or 3 agents needed. I need to check our budget first and discuss with our manager.` },
        { speaker: "Agent", time: "00:33", text: `Understood. I can email you our brochure and pricing sheet so you have all the information handy for your manager.`, translation: `Understood. I can email you our brochure and pricing sheet so you have all the information handy for your manager.` },
        { speaker: "Lead", time: "00:41", text: `That would be great. Thank you. Have a good day.`, translation: `That would be great. Thank you. Have a good day.` }
      ],
      analysis: (leadName, companyName) => `Lead ${leadName} raised enquiries regarding multi-language support capabilities (specifically French & Spanish). Company size is small (2-3 seats). Sent brochure and pricing sheet; awaiting internal budget clearance.`,
      aiScore: 68
    },
    negative: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with ${leadName}?`, translation: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:06", text: `I am busy right now. What is this about?`, translation: `I am busy right now. What is this about?` },
        { speaker: "Agent", time: "00:11", text: `I understand. I just wanted to share details about our customer support services for ${companyName || "your company"}.`, translation: `I understand. I just wanted to share details about our customer support services for ${companyName || "your company"}.` },
        { speaker: "Lead", time: "00:18", text: `No, we already have an in-house support team and are not looking to outsource. Please do not call this number again. Goodbye.`, translation: `No, we already have an in-house support team and are not looking to outsource. Please do not call this number again. Goodbye.` }
      ],
      analysis: (leadName, companyName) => `Lead ${leadName} declined to engage. Stated they have an in-house team and explicitly requested to be removed from the calling list (DNC).`,
      aiScore: 15
    }
  },
  Spanish: {
    positive: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hola, habla ${agentName} de Virpa Intelligent Systems. ¿Podría hablar con ${leadName}?`, translation: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:08", text: `Sí, yo soy ${leadName}. ¿De qué se trata?`, translation: `Yes, I am ${leadName}. What is this about?` },
        { speaker: "Agent", time: "00:15", text: `Hola ${leadName}, le llamo de Virpa. Ayudamos a empresas como ${companyName || "la suya"} a escalar sus operaciones de atención al cliente con agentes gestionados. Quería saber si están buscando optimizar su servicio este trimestre.`, translation: `Hi ${leadName}, I'm calling from Virpa. We help companies like ${companyName || "yours"} scale customer support operations with managed agents. I wanted to see if you are looking to optimize your service this quarter.` },
        { speaker: "Lead", time: "00:26", text: `De hecho, sí. Hemos estado experimentando un alto volumen de llamadas en ${companyName || "nuestra firma"} últimamente y buscamos soluciones de outsourcing. ¿Podría darme detalles de precios?`, translation: `Actually, yes. We've been experiencing a high call volume at ${companyName || "our firm"} lately and are looking for outsourcing solutions. Could you give me details on pricing?` },
        { speaker: "Agent", time: "00:38", text: `¡Por supuesto! Ofrecemos cobertura 24/7. Puedo programar una demostración el próximo martes para mostrarle nuestra plataforma y tarifas. ¿Le parece bien?`, translation: `Of course! We offer 24/7 coverage. I can schedule a demo next Tuesday to show you our platform and rates. Does that sound good?` },
        { speaker: "Lead", time: "00:48", text: `Sí, me parece perfecto. El martes a las 10 AM. Envíeme la invitación por correo electrónico.`, translation: `Yes, sounds perfect. Tuesday at 10 AM. Send me the invitation by email.` }
      ],
      analysis: (leadName, companyName) => `Call conducted in Spanish. Lead ${leadName} from ${companyName || "independent firm"} showed strong interest due to high call volumes. Scheduled follow-up meeting next Tuesday at 10 AM.`,
      aiScore: 94
    },
    neutral: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hola, soy ${agentName} de soporte de Virpa. ¿Cómo puedo ayudarle hoy?`, translation: `Hello, I am ${agentName} from Virpa Support. How can I help you today?` },
        { speaker: "Lead", time: "00:08", text: `Hola, estaba revisando su web y tenía preguntas sobre el soporte bilingüe. ¿Tienen agentes que hablen inglés y español?`, translation: `Hello, I was checking your website and had questions about bilingual support. Do you have agents who speak English and Spanish?` },
        { speaker: "Agent", time: "00:16", text: `Sí, todos nuestros agentes en esta región son bilingües inglés-español. ¿De qué tamaño es su equipo?`, translation: `Yes, all our agents in this region are bilingual English-Spanish. What size is your team?` },
        { speaker: "Lead", time: "00:24", text: `Somos una startup pequeña, tal vez necesitemos 2 agentes. Necesito consultar el presupuesto con mi socio primero.`, translation: `We are a small startup, maybe we need 2 agents. I need to consult the budget with my partner first.` },
        { speaker: "Agent", time: "00:34", text: `Entendido. Le enviaré el folleto y tarifas por correo para que lo evalúe con su socio.`, translation: `Understood. I will send you the brochure and rates by email to evaluate with your partner.` },
        { speaker: "Lead", time: "00:41", text: `Excelente. Muchas gracias. Que tenga un buen día.`, translation: `Excellent. Thank you very much. Have a good day.` }
      ],
      analysis: (leadName, companyName) => `Lead ${leadName} enquired in Spanish about English/Spanish bilingual support capabilities. Small team requirement (2 agents). Sent rate sheet; awaiting partner evaluation.`,
      aiScore: 70
    },
    negative: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hola, habla ${agentName} de Virpa. ¿Puedo hablar con ${leadName}?`, translation: `Hello, this is ${agentName} from Virpa. Can I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:07", text: `Estoy en una reunión ahora. ¿Qué desea?`, translation: `I am in a meeting now. What do you want?` },
        { speaker: "Agent", time: "00:12", text: `Disculpe la molestia. Quería presentarle nuestras soluciones de atención telefónica para ${companyName || "su empresa"}.`, translation: `Apologies for the interruption. I wanted to introduce our telephone support solutions for ${companyName || "your company"}.` },
        { speaker: "Lead", time: "00:19", text: `No nos interesa en absoluto. Ya tenemos nuestro propio equipo. Por favor, no vuelva a llamar. Adiós.`, translation: `We are not interested at all. We already have our own team. Please, do not call again. Goodbye.` }
      ],
      analysis: (leadName, companyName) => `Spanish call. Lead ${leadName} was in a meeting, expressed zero interest in outsourcing, and requested to stop future calls.`,
      aiScore: 12
    }
  },
  Hindi: {
    positive: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `नमस्ते, मैं विरपा इंटेलिजेंट सिस्टम्स से ${agentName} बात कर रहा हूँ। क्या मैं ${leadName} जी से बात कर सकता हूँ?`, translation: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with Mr./Ms. ${leadName}?` },
        { speaker: "Lead", time: "00:09", text: `हाँ, मैं ${leadName} बोल रहा हूँ। आप कौन बोल रहे हैं और किस बारे में बात करनी है?`, translation: `Yes, I am ${leadName} speaking. Who is this and what is this regarding?` },
        { speaker: "Agent", time: "00:16", text: `नमस्ते ${leadName} जी, मैं विरपा से कॉल कर रहा हूँ। हम ${companyName || "आपकी कंपनी"} जैसी कंपनियों को कस्टमर सपोर्ट बढ़ाने में मदद करते हैं। क्या आप कस्टमर सपोर्ट आउटसोर्सिंग देख रहे हैं?`, translation: `Hello ${leadName} ji, I'm calling from Virpa. We help companies like ${companyName || "yours"} scale customer support. Are you looking at customer support outsourcing?` },
        { speaker: "Lead", time: "00:27", text: `हाँ, सही समय पर कॉल किया। ${companyName || "हमारी कंपनी"} में टिकट्स बहुत बढ़ गए हैं और हम आउटसोर्सिंग विकल्प देख रहे हैं। आपके चार्जेस क्या हैं?`, translation: `Yes, timely call. Tickets have increased a lot at ${companyName || "our company"} and we are looking at outsourcing options. What are your charges?` },
        { speaker: "Agent", time: "00:39", text: `निश्चित रूप से! हम 24/7 सपोर्ट प्रदान करते हैं। मैं अगले मंगलवार को एक डेमो शेड्यूल कर सकता हूँ जिसमें प्राइसिंग शेयर करूँगा। क्या यह ठीक रहेगा?`, translation: `Certainly! We provide 24/7 support. I can schedule a demo next Tuesday to share pricing. Would that be fine?` },
        { speaker: "Lead", time: "00:49", text: `हाँ, मंगलवार सुबह 10 बजे ठीक रहेगा। मुझे ईमेल पर मीटिंग का लिंक भेज दीजिए।`, translation: `Yes, Tuesday 10 AM is fine. Send me the meeting link on email.` }
      ],
      analysis: (leadName, companyName) => `Call conducted in Hindi. Lead ${leadName} from ${companyName || "firm"} expressed positive intent and requested pricing due to rising ticket loads. Scheduled Tuesday demo at 10 AM.`,
      aiScore: 90
    },
    neutral: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `नमस्ते, मैं विरपा सपोर्ट से ${agentName} बोल रहा हूँ। आज मैं आपकी क्या सहायता कर सकता हूँ?`, translation: `Hello, I am ${agentName} from Virpa Support. How can I assist you today?` },
        { speaker: "Lead", time: "00:07", text: `नमस्ते, मुझे आपकी वेबसाइट पर दी गई सेवाओं के बारे में जानना था। क्या आपकी टीम हिंदी और अंग्रेजी दोनों में बात कर सकती है?`, translation: `Hello, I wanted to know about the services listed on your website. Can your team speak in both Hindi and English?` },
        { speaker: "Agent", time: "00:15", text: `हाँ जी, हमारी पूरी टीम द्विभाषी (Bilingual) है और हिंदी-अंग्रेजी दोनों में कुशल है। आपके यहाँ कितने एजेंट्स की आवश्यकता है?`, translation: `Yes, our entire team is bilingual and proficient in both Hindi and English. How many agents do you require?` },
        { speaker: "Lead", time: "00:23", text: `अभी तो हम छोटे स्तर पर शुरू कर रहे हैं, शायद सिर्फ 2 या 3 लोग। मुझे बजट के लिए अपने मैनेजर से बात करनी होगी।`, translation: `Right now we are starting on a small scale, maybe just 2 or 3 people. I need to talk to my manager for budget.` },
        { speaker: "Agent", time: "00:32", text: `कोई बात नहीं। मैं आपको ईमेल पर ब्रॉशर और प्राइस डिटेल्स भेज देता हूँ ताकि आप चर्चा कर सकें।`, translation: `No problem. I will send you the brochure and price details by email so you can discuss.` },
        { speaker: "Lead", time: "00:40", text: `बहुत धन्यवाद। आपका दिन शुभ हो।`, translation: `Thank you very much. Have a nice day.` }
      ],
      analysis: (leadName, companyName) => `Hindi call. Lead ${leadName} enquired about Hindi-English bilingual agent services. Small team requirements (2-3 seats). Shared brochure over email for management review.`,
      aiScore: 66
    },
    negative: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `नमस्ते, मैं विरपा से ${agentName} बात कर रहा हूँ। क्या मैं ${leadName} से बात कर सकता हूँ?`, translation: `Hello, this is ${agentName} from Virpa. Can I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:07", text: `मैं अभी गाड़ी चला रहा हूँ। क्या बात है?`, translation: `I am driving right now. What is it?` },
        { speaker: "Agent", time: "00:12", text: `माफ़ी चाहूँगा। मैं ${companyName || "आपकी कंपनी"} के लिए हमारे कस्टमर सपोर्ट सॉल्यूशंस की जानकारी देना चाहता था।`, translation: `Apologies. I wanted to share information about our customer support solutions for ${companyName || "your company"}.` },
        { speaker: "Lead", time: "00:18", text: `हमें इसकी ज़रूरत नहीं है, हमारे पास पहले से ही टीम है। कृपया दोबारा फ़ोन मत कीजिएगा। धन्यवाद।`, translation: `We don't need this, we already have a team. Please do not call again. Thank you.` }
      ],
      analysis: (leadName, companyName) => `Hindi call. Lead ${leadName} was driving, rejected outsourcing offers immediately claiming they already have a team, and requested not to be called back.`,
      aiScore: 10
    }
  },
  French: {
    positive: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Bonjour, ici ${agentName} de Virpa Intelligent Systems. Puis-je parler à ${leadName}?`, translation: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:08", text: `Oui, c'est bien moi. C'est à quel sujet?`, translation: `Yes, this is indeed me. What is this regarding?` },
        { speaker: "Agent", time: "00:15", text: `Bonjour ${leadName}, je vous appelle de Virpa. Nous aidons les entreprises comme ${companyName || "la vôtre"} à développer leur support client. Je voulais savoir si vous cherchiez à optimiser votre service.`, translation: `Hello ${leadName}, I'm calling from Virpa. We help companies like ${companyName || "yours"} scale support. I wanted to know if you're looking to optimize your service.` },
        { speaker: "Lead", time: "00:26", text: `En fait, oui. Nous avons un volume élevé de tickets chez ${companyName || "notre entreprise"} en ce moment et nous étudions l'outsourcing. Pouvez-vous détailler vos prix?`, translation: `Actually, yes. We have a high ticket volume at ${companyName || "our company"} right now and we are studying outsourcing. Can you detail your prices?` },
        { speaker: "Agent", time: "00:38", text: `Absolument. Nous offrons un support 24/7. Je peux programmer une démo mardi prochain pour vous présenter nos offres. Qu'en pensez-vous?`, translation: `Absolutely. We offer 24/7 support. I can schedule a demo next Tuesday to show you our offers. What do you think?` },
        { speaker: "Lead", time: "00:48", text: `Oui, c'est parfait. Faisons cela mardi à 10h. Envoyez-moi l'invitation par e-mail.`, translation: `Yes, that's perfect. Let's do Tuesday at 10 AM. Send me the invitation by email.` }
      ],
      analysis: (leadName, companyName) => `Call conducted in French. Lead ${leadName} from ${companyName || "company"} showed high interest due to ticket backlogs. Tuesday demo scheduled at 10 AM.`,
      aiScore: 93
    },
    neutral: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Bonjour, je suis ${agentName} du support Virpa. Comment puis-je vous aider aujourd'hui?`, translation: `Hello, I am ${agentName} from Virpa Support. How can I help you today?` },
        { speaker: "Lead", time: "00:08", text: `Bonjour, je visitais votre site et j'avais des questions sur le support multilingue. Avez-vous des agents francophones et anglophones?`, translation: `Hello, I was visiting your site and had questions about multilingual support. Do you have French and English speaking agents?` },
        { speaker: "Agent", time: "00:16", text: `Oui, nous avons une équipe dédiée bilingue français-anglais. De combien d'agents auriez-vous besoin?`, translation: `Yes, we have a dedicated French-English bilingual team. How many agents would you need?` },
        { speaker: "Lead", time: "00:24", text: `Nous sommes une petite structure, peut-être 2 agents. Je dois en parler à mon responsable financier d'abord.`, translation: `We are a small structure, maybe 2 agents. I need to talk to our financial manager first.` },
        { speaker: "Agent", time: "00:34", text: `Compris. Je vais vous envoyer notre brochure et grille tarifaire par e-mail pour faciliter votre échange.`, translation: `Understood. I will send you our brochure and pricing grid by email to facilitate your discussion.` },
        { speaker: "Lead", time: "00:41", text: `Parfait, merci beaucoup. Bonne journée.`, translation: `Perfect, thank you very much. Good day.` }
      ],
      analysis: (leadName, companyName) => `French call. Lead ${leadName} enquired about French/English bilingual desks. Needs 2 agents. Sent rates sheet; awaiting financial manager approval.`,
      aiScore: 69
    },
    negative: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Bonjour, ici ${agentName} de Virpa. Puis-je parler à ${leadName}?`, translation: `Hello, this is ${agentName} from Virpa. Can I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:07", text: `Je suis occupé. De quoi s'agit-il?`, translation: `I am busy. What is this about?` },
        { speaker: "Agent", time: "00:12", text: `Désolé. Je voulais vous parler de nos offres de support client pour ${companyName || "votre société"}.`, translation: `Sorry. I wanted to talk to you about our customer support offers for ${companyName || "your company"}.` },
        { speaker: "Lead", time: "00:18", text: `Non, nous gérons tout en interne et n'avons pas besoin de prestataires. Ne me rappelez plus. Merci.`, translation: `No, we manage everything internally and do not need providers. Do not call me again. Thank you.` }
      ],
      analysis: (leadName, companyName) => `French call. Lead ${leadName} was busy, stated they run support in-house, and requested to be excluded from calling list.`,
      aiScore: 11
    }
  },
  German: {
    positive: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hallo, hier spricht ${agentName} von Virpa Intelligent Systems. Kann ich mit ${leadName} sprechen?`, translation: `Hello, this is ${agentName} from Virpa Intelligent Systems. May I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:08", text: `Ja, am Apparat. Worum geht es bitte?`, translation: `Yes, speaking. What is this regarding?` },
        { speaker: "Agent", time: "00:15", text: `Hallo ${leadName}, ich rufe von Virpa an. Wir unterstützen Firmen wie ${companyName || "die Ihre"} dabei, den Kundenservice zu skalieren. Suchen Sie nach Optimierung im Support?`, translation: `Hello ${leadName}, I'm calling from Virpa. We support firms like ${companyName || "yours"} in scaling customer service. Are you looking to optimize support?` },
        { speaker: "Lead", time: "00:26", text: `Das passt eigentlich gut. Wir haben bei ${companyName || "unserer Firma"} derzeit ein sehr hohes Ticketaufkommen und suchen nach Outsourcing-Optionen. Wie sehen Ihre Preise aus?`, translation: `That actually fits well. We currently have a very high ticket volume at ${companyName || "our firm"} and are looking for outsourcing options. What do your prices look like?` },
        { speaker: "Agent", time: "00:38", text: `Sehr gerne. Wir bieten 24/7 SLA-gestützten Support. Ich kann nächsten Dienstag eine Demo vereinbaren und Ihnen die Tarife zeigen. Passt das?`, translation: `Gladly. We offer 24/7 SLA-backed support. I can arrange a demo next Tuesday and show you the rates. Does that fit?` },
        { speaker: "Lead", time: "00:48", text: `Ja, das klingt perfekt. Machen wir Dienstag um 10 Uhr. Senden Sie mir die Einladung per E-Mail.`, translation: `Yes, that sounds perfect. Let's do Tuesday at 10 AM. Send me the invite by email.` }
      ],
      analysis: (leadName, companyName) => `Call conducted in German. Lead ${leadName} from ${companyName || "firm"} showed high interest due to extreme ticket volumes. Demo scheduled for Tuesday 10 AM.`,
      aiScore: 95
    },
    neutral: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hallo, ich bin ${agentName} vom Virpa-Support. Wie kann ich Ihnen heute helfen?`, translation: `Hello, I am ${agentName} from Virpa Support. How can I help you today?` },
        { speaker: "Lead", time: "00:08", text: `Hallo, ich war auf Ihrer Website und hatte Fragen zum mehrsprachigen Support. Bieten Sie deutsche und englische Agenten an?`, translation: `Hello, I was on your website and had questions about multilingual support. Do you offer German and English agents?` },
        { speaker: "Agent", time: "00:16", text: `Ja, wir haben ein engagiertes deutsch-englisches Team. Wie viele Agenten benötigen Sie voraussichtlich?`, translation: `Yes, we have a dedicated German-English team. How many agents do you estimate you need?` },
        { speaker: "Lead", time: "00:24", text: `Wir sind ein kleines Unternehmen, eventuell 2 Agenten. Ich muss das zuerst mit unserem Geschäftsführer besprechen.`, translation: `We are a small company, possibly 2 agents. I need to discuss this with our Managing Director first.` },
        { speaker: "Agent", time: "00:34", text: `Verstanden. Ich werde Ihnen Broschüre und Preise per E-Mail senden, damit Sie alle Details für die Besprechung vorliegen haben.`, translation: `Understood. I will send you the brochure and prices by email, so you have all details ready for the discussion.` },
        { speaker: "Lead", time: "00:41", text: `Klasse, vielen Dank. Einen schönen Tag noch.`, translation: `Great, thank you very much. Have a nice day.` }
      ],
      analysis: (leadName, companyName) => `German call. Lead ${leadName} asked about German/English agent desks. 2 seats required. Emailed brochures and rates for board discussion.`,
      aiScore: 72
    },
    negative: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `Hallo, hier ist ${agentName} von Virpa. Kann ich mit ${leadName} sprechen?`, translation: `Hello, this is ${agentName} from Virpa. Can I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:07", text: `Ich bin gerade beschäftigt. Worum geht es?`, translation: `I am currently busy. What is this about?` },
        { speaker: "Agent", time: "00:12", text: `Entschuldigung. Ich wollte Ihnen unsere Kundenservice-Lösungen für ${companyName || "Ihre Firma"} vorstellen.`, translation: `Apologies. I wanted to introduce our customer service solutions for ${companyName || "your company"}.` },
        { speaker: "Lead", time: "00:18", text: `Nein, wir machen alles hausintern und haben keinen Bedarf. Bitte rufen Sie nicht mehr an. Danke.`, translation: `No, we do everything in-house and have no need. Please do not call anymore. Thank you.` }
      ],
      analysis: (leadName, companyName) => `German call. Lead ${leadName} was busy, stated they manage support in-house, and requested to block further calls.`,
      aiScore: 14
    }
  },
  Tamil: {
    positive: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `வணக்கம், விர் பேனிக்ஸ் நிறுவனத்திலிருந்து ${agentName} பேசுகிறேன். ${leadName} அவர்களிடம் பேசலாமா?`, translation: `Hello, this is ${agentName} from Virpanix. May I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:08", text: `ஆமாம், நான் தான் ${leadName} பேசுகிறேன். இது எதைப் பற்றியது?`, translation: `Yes, this is ${leadName} speaking. What is this regarding?` },
        { speaker: "Agent", time: "00:15", text: `வணக்கம் ${leadName}, நாங்கள் வாடிக்கையாளர் சேவை செயல்பாடுகளை நிர்வகிக்க உதவுகிறோம். இந்த காலாண்டில் உங்கள் வாடிக்கையாளர் ஆதரவை மேம்படுத்த திட்டமிட்டுள்ளீர்களா?`, translation: `Hi ${leadName}, we help scale customer support operations. Are you looking to optimize your support this quarter?` },
        { speaker: "Lead", time: "00:26", text: `உண்மையில், அது சரியான நேரம். எங்கள் நிறுவனத்தில் வாடிக்கையாளர் டிக்கெட்டுகள் அதிகமாக உள்ளன. உங்கள் சேவைகள் மற்றும் கட்டணங்கள் பற்றிய விவரங்களைப் பகிர முடியுமா?`, translation: `Actually, that is timely. We have high ticket volumes at our company and are looking at outsourcing options. Can you share details and pricing?` },
        { speaker: "Agent", time: "00:38", text: `நிச்சயமாக! நாங்கள் 24/7 ஆதரவை வழங்குகிறோம். அடுத்த செவ்வாய்க்கிழமை காலை 10 மணிக்கு ஒரு டெமோ விளக்கக்காட்சியை ஏற்பாடு செய்யலாமா?`, translation: `Absolutely! We provide 24/7 support. Can I arrange a demo presentation next Tuesday at 10 AM?` },
        { speaker: "Lead", time: "00:48", text: `ஆம், அது சரியாக இருக்கும். செவ்வாய்க்கிழமை காலை 10 மணிக்கு செய்யலாம். எனக்கு மின்னஞ்சலில் அழைப்பை அனுப்பவும்.`, translation: `Yes, that sounds perfect. Let's do Tuesday at 10 AM. Send me the invite over email.` }
      ],
      analysis: (leadName, companyName) => `Call conducted in Tamil. Lead ${leadName} from ${companyName || "independent firm"} showed high interest due to ticket load. Scheduled Tuesday demo at 10 AM.`,
      aiScore: 92
    },
    neutral: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `வணக்கம், விர் பேனிக்ஸ் ஆதரவிலிருந்து ${agentName} பேசுகிறேன். நான் உங்களுக்கு எப்படி உதவ முடியும்?`, translation: `Hello, I am ${agentName} from Virpanix Support. How can I assist you today?` },
        { speaker: "Lead", time: "00:07", text: `வணக்கம், நான் உங்கள் இணையதளத்தைப் பார்த்தேன். உங்களிடம் தமிழ் மற்றும் ஆங்கிலம் இருமொழி ஆதரவு உள்ளதா?`, translation: `Hello, I checked your website. Do you have bilingual support for Tamil and English?` },
        { speaker: "Agent", time: "00:15", text: `ஆம், எங்களிடம் தமிழ் மற்றும் ஆங்கிலம் பேசக்கூடிய வாடிக்கையாளர் சேவை முகவர்கள் உள்ளனர். உங்களுக்கு எத்தனை பேர் தேவைப்படுவார்கள்?`, translation: `Yes, we have support agents speaking Tamil and English. How many agents would you need?` },
        { speaker: "Lead", time: "00:23", text: `நாங்கள் இப்போது சிறிய அளவில் தொடங்குகிறோம், சுமார் 2 பேர் தேவைப்படலாம். பட்ஜெட் பற்றி மேலாளருடன் பேச வேண்டும்.`, translation: `We are starting small right now, maybe just 2 agents. I need to discuss the budget with my manager.` },
        { speaker: "Agent", time: "00:33", text: `புரிந்துகொண்டேன். நான் எங்கள் விலைப்பட்டியலை உங்களுக்கு மின்னஞ்சல் செய்கிறேன், அது உங்கள் மேலாளருடன் விவாதிக்க உதவும்.`, translation: `Understood. I will email you our pricing sheet so you have the details for your manager.` },
        { speaker: "Lead", time: "00:41", text: `மிகவும் நன்றி. நல்ல நாள் அமையட்டும்.`, translation: `Thank you very much. Have a good day.` }
      ],
      analysis: (leadName, companyName) => `Tamil call. Lead ${leadName} enquired about Tamil-English bilingual capabilities. Small team size (2 agents). Shared pricing details over email.`,
      aiScore: 68
    },
    negative: {
      turns: (leadName, companyName, agentName) => [
        { speaker: "Agent", time: "00:02", text: `வணக்கம், விர் பேனிக்ஸ் நிறுவனத்திலிருந்து ${agentName} பேசுகிறேன். ${leadName} அவர்களிடம் பேசலாமா?`, translation: `Hello, this is ${agentName} from Virpanix. May I speak with ${leadName}?` },
        { speaker: "Lead", time: "00:06", text: `நான் இப்போது பிஸியாக இருக்கிறேன். இது எதைப் பற்றியது?`, translation: `I am busy right now. What is this about?` },
        { speaker: "Agent", time: "00:11", text: `மன்னிக்கவும். உங்கள் நிறுவனத்திற்கான வாடிக்கையாளர் சேவை திட்டங்களைப் பற்றிப் பேச அழைத்தேன்.`, translation: `Apologies. I called to share customer support solutions for your company.` },
        { speaker: "Lead", time: "00:18", text: `இல்லை, எங்களுக்குத் தேவையில்லை. எங்களிடம் சொந்த ஆதரவு குழு உள்ளது. மீண்டும் அழைக்க வேண்டாம். விடைபெறுகிறேன்.`, translation: `No, we don't need this. We have our own support team. Please do not call again. Goodbye.` }
      ],
      analysis: (leadName, companyName) => `Tamil call. Lead ${leadName} was busy and declined services claiming they have an in-house team. Requested to opt-out.`,
      aiScore: 12
    }
  }
};


/**
 * Helper to find the ending boundary of the automated system greeting in the raw transcript.
 */
function findBoundarySplitIndex(rawTranscript: string): { index: number; boundaryLength: number } {
  const boundaryPhrases = [
    "hang up when you are finished",
    "cuelgue cuando termine",
    "पूरा होने पर फोन काट दें",
    "raccrochez lorsque vous avez terminé",
    "raccrochez lorsque vous avez termine",
    "legen sie auf wenn sie fertig sind",
    "முடித்ததும் போனை தொங்கவிடவும்",
    "முடித்ததும் போனை தொங்க விடவும்",
    "முடித்ததும் போனை தொங்கவிடுங்கள்",
    "முடித்ததும் போனை தொங்க விடுங்கள்",
    "முடித்ததும் போனை தொங்கவிடங்கள்",
    "முடித்ததும் போனை தொங்க விடங்கள்",
    "போனை தொங்கவிடவும்",
    "போனை தொங்க விடவும்",
    "போனை தொங்கவிடுங்கள்",
    "போனை தொங்க விடுங்கள்",
    "போனை தொங்கவிடங்கள்",
    "போனை தொங்க விடங்கள்",
    "தொங்கவிடவும்",
    "தொங்க விடவும்",
    "தொங்கவிடுங்கள்",
    "தொங்க விடுங்கள்",
    "தொங்கவிடங்கள்",
    "தொங்க விடங்கள்",
    
    // Romanized Tamil boundaries
    "mudithathum phoneai thongavidavum",
    "mudithathum phone ai thongavidavum",
    "mudithathum phone-ai thongavidavum",
    "mudithathum phoneai thonga vidavum",
    "mudithathum phone ai thonga vidavum",
    "mudithathum phone-ai thonga vidavum",
    "mudindhathum phoneai thongavidavum",
    "mudindhathum phone ai thongavidavum",
    "mudindhathum phone-ai thongavidavum",
    "mudindhathum phoneai thonga vidavum",
    "mudindhathum phone ai thonga vidavum",
    "mudindhathum phone-ai thonga vidavum",
    "thongavidavum",
    "thonga vidavum",
    "tongavidavom",
    "tonga vidavom",
    "thongavidavom",
    "thonga vidavom",

    // Romanized Hindi boundaries
    "poora hone par phone kaat dein",
    "poora hone par phone kaat den",
    "poora hone par phone kat dein",
    "poora hone par phone kat den",
    "poora hone par phone kaat de",
    "poora hone par phone kat de",
    "phone kaat dein",
    "phone kaat den",
    "phone kat de",
    "phone kaat de"
  ];

  for (const phrase of boundaryPhrases) {
    const words = phrase.split(/\s+/);
    const regexStr = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join("[^a-zA-Z0-9\\u0900-\\u097F\\u0B80-\\u0BFF]+");
    const regex = new RegExp(regexStr, "i");
    const match = rawTranscript.match(regex);
    if (match && match.index !== undefined) {
      return { index: match.index, boundaryLength: match[0].length };
    }
  }

  return { index: -1, boundaryLength: 0 };
}

/**
 * Returns the exact system greeting (text in native script and translation in English)
 * based on the target language of the call.
 */
function getStaticAgentTurn(language: string, leadName: string): { text: string; translation: string } {
  const normLang = language.toLowerCase();
  if (normLang === "spanish") {
    return {
      text: `Hola ${leadName}. Bienvenido a la consola de ventas de Virpanix. Por favor hable después del tono y grabaremos su mensaje. Cuelgue cuando termine.`,
      translation: `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will record it. Hang up when you are finished.`
    };
  }
  if (normLang === "hindi") {
    return {
      text: `नमस्ते ${leadName} जी। विरपैनिक्स सेल्स कंसोल में आपका स्वागत है। कृपया बीप के बाद अपना संदेश बोलें और हम इसे रिकॉर्ड करेंगे। पूरा होने पर फोन काट दें।`,
      translation: `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will record it. Hang up when you are finished.`
    };
  }
  if (normLang === "french") {
    return {
      text: `Bonjour ${leadName}. Bienvenue sur la console de vente Virpanix. Veuillez parler après le signal sonore et nous enregistrerons votre message. Raccrochez lorsque vous avez terminé.`,
      translation: `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will record it. Hang up when you are finished.`
    };
  }
  if (normLang === "german") {
    return {
      text: `Hallo ${leadName}. Willkommen bei der Virpanix-Verkaufskonsole. Bitte sprechen Sie Ihre Nachricht nach dem Signalton und wir werden sie aufzeichnen. Legen Sie auf, wenn Sie fertig sind.`,
      translation: `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will record it. Hang up when you are finished.`
    };
  }
  if (normLang === "tamil") {
    return {
      text: `வணக்கம் ${leadName}. விர் பேனிக்ஸ் விற்பனை கன்சோலுக்கு உங்களை வரவேற்கிறோம். தயவுசெய்து பீப் ஒலிக்குப் பிறகு உங்கள் செய்தியைப் பேசுங்கள், நாங்கள் அதை பதிவு செய்வோம். நீங்கள் முடித்ததும் போனை தொங்கவிடவும்.`,
      translation: `Welcome ${leadName}. We welcome you to the Virpanix Sales Console. Please speak your message after the beep, and we will record it. Hang up when you are finished.`
    };
  }
  // Default to English
  return {
    text: `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will transcribe it. Hang up when you are finished.`,
    translation: `Hello ${leadName}. Welcome to the Virpanix Sales Console. Please speak your message after the beep, and we will transcribe it. Hang up when you are finished.`
  };
}

/**
 * Clean automated greeting phrases from the raw Whisper transcript.
 */
function cleanGreetingPhrases(rawTranscript: string, leadName: string): string {
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
    /வணக்கம்\s+.*?\s*விர்பெனிக்ஸ்\s+கன்சோலுக்கு\s+உங்களை\s+வரவேற்கிறோம்/g,
    /வணக்கம்\s+.*?\s*உங்களை\s+வரவேற்கிறோம்/g,
    /விர்\s+பேனிக்ஸ்\s+விற்பனை\s+கன்சோலுக்கு\s+உங்களை\s+வரவேற்கிறோம்/g,
    /விர்பெனிக்ஸ்\s+கன்சோல்\s+உங்களை\s+வரவேற்கிறோம்/g,
    /விர்பெனிக்ஸ்\s+கன்சோலுக்கு\s+உங்களை\s+வரவேற்கிறோம்/g,
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
    /நீங்கள்\s+முடித்ததும்\s+போனை\s+தொங்க\s+விடவும்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனி\s+தொங்கவிடவும்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனி\s+தொங்க\s+விடவும்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனை\s+தொங்கவிடுங்கள்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனை\s+தொங்க\s+விடுங்கள்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனை\s+தொங்கவிடங்கள்/g,
    /நீங்கள்\s+முடித்ததும்\s+போனை\s+தொங்க\s+விடங்கள்/g,
    /போனை\s+தொங்கவிடவும்/g,
    /போனை\s+தொங்க\s+விடவும்/g,
    /போனி\s+தொங்கவிடவும்/g,
    /போனி\s+தொங்க\s+விடவும்/g,
    /போனை\s+தொங்கவிடுங்கள்/g,
    /போனை\s+தொங்க\s+விடுங்கள்/g,
    /போனை\s+தொங்கவிடங்கள்/g,
    /போனை\s+தொங்க\s+விடங்கள்/g,
    /தொங்கவிடவும்/g,
    /தொங்க\s+விடவும்/g,
    /தொங்கவிடுங்கள்/g,
    /தொங்க\s+விடுங்கள்/g,
    /தொங்கவிடங்கள்/g,
    /தொங்க\s+விடங்கள்/g,

    // Romanized Tamil greetings (flexible name variants)
    /vanakkam\s+.*?\s*(?:vir|vi|virpe|vipa)nix/gi,
    /wanaqam\s+.*?\s*(?:vir|vi|virpe|vipa)nix/gi,
    /vanakkam/gi,
    /wanaqam/gi,
    /thonga\s*vidavum/gi,
    /thonga\s*vidavom/gi,
    /tongavidavom/gi,
    /mudithathum/gi,
    /mudindhathum/gi,

    // Spanish greetings
    /hola\s+.*?\s*bienvenido\s+a\s+la\s+consola/gi,
    /hola/gi,
    /bienvenido\s+a\s+la\s+consola\s+de\s+ventas\s+de\s+virpanix/gi,
    /por\s+favor\s+hable\s+después\s+del\s+tono\s+y\s+grabaremos\s+su\s+mensaje/gi,
    /cuelgue\s+cuando\s+termine/gi,

    // Hindi greetings
    /नमस्ते\s+.*?\s*जी\s*विरपैनिक्स\s+सेल्स\s+कंसोल\s+में\s+आपका\s+स्वागत\s+है/g,
    /नमस्ते/g,
    /विरपैनिक्स\s+सेल्स\s+कंसोल\s+में\s+आपका\s+स्वागत\s+है/g,
    /कृपया\s+बीप\s+के\s+बाद\s+अपना\s+संदेश\s+बोलें\s+और\s+हम\s+इसे\s+रिकॉर्ड\s+करेंगे/g,
    /पूरा\s+होने\s+पर\s+फोन\s+काट\s+दें/g,

    // Romanized Hindi greetings
    /namaste\s+.*?\s*(?:vir|vi|virpe|vipa)nix/gi,
    /namaste/gi,
    /swagat\s+hai/gi,
    /apka\s+swagat\s+hai/gi,
    /aapka\s+swagat\s+hai/gi,
    /kripya\s+beep\s+ke\s+baad/gi,
    /kripya\s+beep\s+ke\s+bad/gi,
    /apna\s+sandesh\s+bolein/gi,
    /apna\s+sandesh\s+bolen/gi,
    /phone\s+kaat\s+dein/gi,
    /phone\s+kaat\s+den/gi,
    /phone\s+kat\s+de/gi,

    // French greetings
    /bonjour\s+.*?\s*bienvenue\s+sur\s+la\s+console/gi,
    /bonjour/gi,
    /bienvenue\s+sur\s+la\s+console\s+de\s+vente\s+virpanix/gi,
    /veuillez\s+parler\s+après\s+le\s+signal\s+sonore\s+et\s+nous\s+enregistrerons\s+votre\s+message/gi,
    /raccrochez\s+lorsque\s+vous\s+avez\s+terminé/gi,

    // German greetings
    /hallo\s+.*?\s*willkommen/gi,
    /hallo/gi,
    /willkommen\s+bei\s+der\s+virpanix-verkaufskonsole/gi,
    /bitte\s+sprechen\s+sie\s+ihre\s+nachricht\s+nach\s+dem\s+signalton\s+und\s+wir\s+werden\s+sie\s+aufzeichnen/gi,
    /legen\s+sie\s+auf\s+wenn\s+sie\s+fertig\s+sind/gi
  ];

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Clean up any remaining leading/trailing punctuation and double spaces
  cleaned = cleaned
    .replace(/^[\s.,\/#!$%\^&\*;:{}=\-_`~()?]+/, "")
    .replace(/[\s.,\/#!$%\^&\*;:{}=\-_`~()?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

/**
 * Helper to resample Float32Array audio data from one sample rate to another using linear interpolation.
 */
function resample(audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return audioData;
  }
  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    if (index + 1 < audioData.length) {
      result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
    } else {
      result[i] = audioData[index];
    }
  }
  return result;
}

/**
 * Post-processes transcription text to deduplicate repetitive word/phrase loops.
 */
export function removeRepetitivePhrases(text: string): string {
  if (!text) return "";
  
  // 1. Clean single word repetitions (e.g. "பார்க்கும் பார்க்கும் பார்க்கும்...")
  const words = text.split(/\s+/).filter(Boolean);
  const cleanWords: string[] = [];
  let consecutiveWordCount = 0;
  for (let i = 0; i < words.length; i++) {
    if (cleanWords.length > 0 && words[i] === cleanWords[cleanWords.length - 1]) {
      consecutiveWordCount++;
      if (consecutiveWordCount < 3) {
        cleanWords.push(words[i]);
      }
    } else {
      consecutiveWordCount = 1;
      cleanWords.push(words[i]);
    }
  }
  let processedText = cleanWords.join(" ");
  
  // 2. Clean multi-word phrase repetitions (e.g. "ஏதுவான் அவர் தான் போடுங்கள்" repeating)
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    processedText = processedText.replace(/(.{8,60}?)\s+(?:\1\s*){2,}/g, (match, group) => {
      changed = true;
      return group + " ";
    });
  }
  
  return processedText.trim();
}

/**
 * Parses a flat text transcript (e.g. from Gemini or elsewhere) containing timestamps and
 * translations into a structured array of turns.
 */
export function parseFlatTranscriptToTurns(flatText: string): Array<{ speaker: string; time: string; text: string; translation: string }> {
  if (!flatText) return [];

  const lines = flatText.split("\n").map(l => l.trim()).filter(Boolean);
  
  let translationStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes("translation") || lines[i].toLowerCase().includes("english")) {
      translationStartIndex = i;
    }
  }

  const nativeTurnsMap = new Map<string, string>();
  const translationTurnsMap = new Map<string, string>();

  const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/;

  const limitIndex = translationStartIndex !== -1 ? translationStartIndex : lines.length;

  for (let i = 0; i < limitIndex; i++) {
    const match = lines[i].match(timestampRegex);
    if (match) {
      const time = match[1];
      const timeIndex = lines[i].indexOf(time);
      let content = lines[i].substring(timeIndex + time.length).replace(/^[—:\-\s]+/, "").trim();
      nativeTurnsMap.set(time, content);
    }
  }

  if (translationStartIndex !== -1) {
    for (let i = translationStartIndex + 1; i < lines.length; i++) {
      const match = lines[i].match(timestampRegex);
      if (match) {
        const time = match[1];
        const timeIndex = lines[i].indexOf(time);
        let content = lines[i].substring(timeIndex + time.length).replace(/^[—:\-\s]+/, "").trim();
        content = content.replace(/\[\d+\]/g, "").trim();
        translationTurnsMap.set(time, content);
      }
    }
  }

  const turns: any[] = [];
  for (let i = 0; i < limitIndex; i++) {
    const match = lines[i].match(timestampRegex);
    if (match) {
      const time = match[1];
      const nativeText = nativeTurnsMap.get(time) || "";
      const translationText = translationTurnsMap.get(time) || nativeText;
      
      if (!turns.some(t => t.time === time)) {
        turns.push({
          speaker: "Lead",
          time: time,
          text: nativeText,
          translation: translationText
        });
      }
    }
  }

  return turns;
}

/**
 * Downloads the actual audio from Twilio's public RecordingUrl, sends it to OpenAI Whisper,
 * and formats/translates/summarizes the conversation using GPT-4o-mini.
 */
export async function transcribeAndAnalyzeRecording(
  recordingUrl: string,
  apiKey: string,
  leadName: string,
  agentName: string,
  targetLanguage: string = "English",
  isWebRTC: boolean = false
) {
  try {
    let arrayBuffer: ArrayBuffer = new ArrayBuffer(0);
    const useLocalWhisper = process.env.USE_LOCAL_WHISPER === "true";
    const skipLlm = process.env.SKIP_LLM_ANALYSIS === "true";
    let whisperData: any = null;

    const promptMap: Record<string, string> = {
      English: "Pranesh, Coimbatore, Thudiyalur, Saravanampatti, Annur, plot, villa, flat, budget, 5 to 7 lakhs, amenities, parking, power, water, Friday site visit, slot booking.",
      Tamil: "பிரனேஷ், கோயம்புத்தூர், துடியலூர், சரவணம்பட்டி, அன்னூர், மனை, வில்லா, பிளாட், பட்ஜெட், 5 முதல் 7 லட்சம், வசதிகள், பார்க்கிங், மின்சாரம், தண்ணீர், வெள்ளிக்கிழமை தள வருகை, ஸ்லாட் முன்பதிவு.",
      Hindi: "प्रणेश, कोयंबटूर, तुडियालूर, सरवनमपट्टी, अन्नूर, प्लॉट, विला, फ्लैट, बजट, 5 से 7 लाख, सुविधाएं, पार्किंग, बिजली, पानी, शुक्रवार साइट विजिट, स्लॉट बुकिंग।",
      Spanish: "Pranesh, Coimbatore, Thudiyalur, Saravanampatti, Annur, parcela, villa, piso, presupuesto, 5 a 7 lakhs, servicios, estacionamiento, energía, agua, visita al sitio el viernes, reserva de turno.",
      French: "Pranesh, Coimbatore, Thudiyalur, Saravanampatti, Annur, terrain, villa, appartement, budget, 5 à 7 lakhs, commodités, parking, électricité, eau, visite du site le vendredi, réservation de créneau.",
      German: "Pranesh, Coimbatore, Thudiyalur, Saravanampatti, Annur, Grundstück, Villa, Wohnung, Budget, 5 bis 7 Lakhs, Annehmlichkeiten, Parkplatz, Strom, Wasser, Besichtigung am Freitag, Slot-Buchung."
    };
    const whisperPrompt = promptMap[targetLanguage] || promptMap.English;

    if (useLocalWhisper) {
      const wavUrl = recordingUrl.endsWith(".wav") ? recordingUrl : `${recordingUrl}.wav`;
      console.log(`[Local Whisper] Downloading WAV call recording from: ${wavUrl}`);
      const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
      const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

      const audioRes = await fetch(wavUrl, {
        headers: {
          Authorization: authHeader
        }
      });
      if (!audioRes.ok) {
        throw new Error(`Failed to fetch WAV audio from Twilio: ${audioRes.status} ${audioRes.statusText}`);
      }
      const wavBuffer = await audioRes.arrayBuffer();

      console.log("[Local Whisper] Decoding WAV audio...");
      const wavDecoder = require("node-wav");
      const decoded = wavDecoder.decode(Buffer.from(wavBuffer));
      let rawAudio = decoded.channelData[0];
      if (decoded.channelData.length > 1) {
        console.log(`[Local Whisper] Mixing down ${decoded.channelData.length} stereo channels to mono...`);
        const chan0 = decoded.channelData[0];
        const chan1 = decoded.channelData[1];
        const mono = new Float32Array(chan0.length);
        for (let i = 0; i < chan0.length; i++) {
          mono[i] = (chan0[i] + chan1[i]) / 2;
        }
        rawAudio = mono;
      }
      const sampleRate = decoded.sampleRate;

      console.log(`[Local Whisper] Resampling audio from ${sampleRate}Hz to 16000Hz...`);
      const audioData = resample(rawAudio, sampleRate, 16000);
      
      console.log("[Local Whisper] Re-encoding resampled audio to 16kHz WAV...");
      const encodedWavBuffer = wavDecoder.encode([audioData], { sampleRate: 16000 });

      let pythonSuccess = false;
      
      try {
        console.log("[Local Whisper] Attempting Python faster-whisper server at http://127.0.0.1:8000/transcribe...");
        let pyModel = "medium";
        const envModel = process.env.LOCAL_WHISPER_MODEL || "";
        if (envModel.includes("small")) pyModel = "small";
        else if (envModel.includes("base")) pyModel = "base";
        else if (envModel.includes("large")) pyModel = "large-v3";
        else if (envModel.includes("medium")) pyModel = "medium";
        
        const pyLanguage = targetLanguage.toLowerCase() === "tamil" ? "ta" : "en";

        // Build multipart/form-data body manually to prevent Node.js native fetch/FormData stream hang bug
        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
        const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.wav"\r\nContent-Type: audio/wav\r\n\r\n`;
        const modelPart = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model_name"\r\n\r\n${pyModel}`;
        const langPart = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${pyLanguage}`;
        const promptPart = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="initial_prompt"\r\n\r\n${whisperPrompt}`;
        const footer = `\r\n--${boundary}--\r\n`;

        const multipartBody = Buffer.concat([
          Buffer.from(fileHeader, "utf-8"),
          Buffer.from(encodedWavBuffer),
          Buffer.from(modelPart, "utf-8"),
          Buffer.from(langPart, "utf-8"),
          Buffer.from(promptPart, "utf-8"),
          Buffer.from(footer, "utf-8")
        ]);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 mins

        const resData = await new Promise<any>((resolve, reject) => {
          const http = require("http");
          const req = http.request({
            hostname: "127.0.0.1",
            port: 8000,
            path: "/transcribe",
            method: "POST",
            headers: {
              "Content-Type": `multipart/form-data; boundary=${boundary}`,
              "Content-Length": multipartBody.length
            }
          }, (res: any) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`Python server returned status ${res.statusCode}`));
              return;
            }
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk: string) => { body += chunk; });
            res.on("end", () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(new Error("Failed to parse JSON response from Python server"));
              }
            });
          });

          req.on("error", (err: any) => {
            reject(err);
          });

          controller.signal.addEventListener("abort", () => {
            req.destroy();
            reject(new Error("Request aborted"));
          });

          req.write(multipartBody);
          req.end();
        });
        
        clearTimeout(timeoutId);

        if (resData) {
          console.log("[Local Whisper] Python server transcription succeeded!");
          whisperData = {
            text: resData.segments.map((s: any) => s.text).join(" "),
            segments: resData.segments.map((s: any) => ({
              text: s.text || "",
              start: s.start || 0,
              end: s.end || 0
            }))
          };
          pythonSuccess = true;
        } else {
          console.warn(`[Local Whisper] Python server returned empty response. Falling back to Node.js...`);
        }
      } catch (err: any) {
        console.error("[Local Whisper] Python server connection failed:", err);
      }

      if (!pythonSuccess) {
        console.log("[Local Whisper] Initializing local JS Whisper pipeline...");
        const { pipeline, env } = await import("@xenova/transformers");
        if (env.backends && env.backends.onnx) {
          env.backends.onnx.logLevelInternal = "error";
        }
        let modelName = process.env.LOCAL_WHISPER_MODEL || "Xenova/whisper-base";
        if (modelName === "small") modelName = "Xenova/whisper-small";
        else if (modelName === "medium") modelName = "Xenova/whisper-medium";
        else if (modelName === "base") modelName = "Xenova/whisper-base";
        const transcriber = await pipeline("automatic-speech-recognition", modelName);

        console.log(`[Local Whisper] Transcribing audio with model: ${modelName} and language: ${targetLanguage}...`);
        const pipelineOptions: any = {
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: true,
          task: "transcribe",
        };
        
        if (targetLanguage && targetLanguage.toLowerCase() !== "auto") {
          pipelineOptions.language = targetLanguage.toLowerCase();
        }

        const output = (await transcriber(audioData, pipelineOptions)) as any;
        console.log("[Local Whisper] Local JS transcription complete!");

        whisperData = {
          text: output.text || "",
          segments: (output.chunks || []).map((chunk: any) => ({
            text: chunk.text || "",
            start: chunk.timestamp ? chunk.timestamp[0] : 0,
            end: chunk.timestamp ? chunk.timestamp[1] : 0,
          }))
        };
      }
    } else {
      const mp3Url = recordingUrl.endsWith(".mp3") ? recordingUrl : `${recordingUrl}.mp3`;
      console.log(`[Whisper] Downloading MP3 call recording from: ${mp3Url}`);
      
      const isPlivo = mp3Url.includes("plivo.com");
      let authHeader = "";
      
      if (isPlivo) {
        const { prisma } = require("@/lib/db");
        const sipConfig = await prisma.sipTrunkConfig.findFirst({
          where: { isActive: true }
        });
        const plivoAuthId = sipConfig?.plivoAuthId || process.env.PLIVO_AUTH_ID || "";
        const plivoAuthToken = sipConfig?.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "";
        if (plivoAuthId && plivoAuthToken) {
          authHeader = "Basic " + Buffer.from(`${plivoAuthId}:${plivoAuthToken}`).toString("base64");
        }
      } else {
        const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
        const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
        if (twilioSid && twilioToken) {
          authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        }
      }

      const headers: Record<string, string> = {};
      if (authHeader) {
        headers["Authorization"] = authHeader;
      }

      const audioRes = await fetch(mp3Url, { headers });
      if (!audioRes.ok) {
        throw new Error(`Failed to fetch audio from ${isPlivo ? "Plivo" : "Twilio"}: ${audioRes.status} ${audioRes.statusText}`);
      }
      arrayBuffer = await audioRes.arrayBuffer();
    }

    // Check for Google Gemini API Key. If present, use Gemini 1.5 Flash
    // for direct, high-quality multimodal audio transcription and speaker classification.
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !useLocalWhisper) {
      console.log("[Gemini] GEMINI_API_KEY detected. Using Gemini 1.5 Flash for transcription and analysis...");
      const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`;
      const uploadMetadata = {
        file: {
          mimeType: "audio/mp3",
          displayName: "call_recording.mp3"
        }
      };

      const boundary = "------Boundary" + Math.random().toString(36).substring(2);
      let body = "";
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="metadata"\r\n`;
      body += `Content-Type: application/json; charset=UTF-8\r\n\r\n`;
      body += JSON.stringify(uploadMetadata) + `\r\n`;
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="call_recording.mp3"\r\n`;
      body += `Content-Type: audio/mp3\r\n\r\n`;

      const preBuffer = Buffer.from(body, "utf-8");
      const postBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
      const fileBuffer = Buffer.from(arrayBuffer);
      const requestBody = Buffer.concat([preBuffer, fileBuffer, postBuffer]);

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "multipart",
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: requestBody
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Gemini upload failed: ${uploadRes.status} - ${errText}`);
      }

      const uploadData = await uploadRes.json();
      const fileUri = uploadData.file.uri;
      const fileName = uploadData.file.name;
      console.log(`[Gemini] Audio uploaded successfully. File URI: ${fileUri}`);

      const promptText = `
You are an advanced BPO quality analyst and CRM sync tool.
Analyze this audio recording of a telephone sales call between Agent: "${agentName}" and Lead: "${leadName}".

Perform the following tasks:
1. Transcribe the entire conversation verbatim, segmenting it by speaker and timestamps.
2. For each segment, provide the "text" in the native language spoken (e.g. Tamil or English).
3. For each segment, provide the "translation" in English. If the original text is already in English, the translation should be identical.
4. Classify each segment's speaker as "Agent" or "Lead" (NOT "Speaker A" / "Speaker B").
5. Format the timestamps as "MM:SS".
6. Detect the primary voice language (e.g., "Tamil", "Hindi", "English").
7. Evaluate the lead quality score on a scale of 0 to 100 based on their interest.
8. Identify and extract the customer's specific requirements from the call (e.g. what services, features, timing, or help they need). Do not write a general summary or analysis; focus purely on listing their explicit requirements.

Provide your response in JSON format matching this schema:
{
  "detectedVoiceLanguage": "Tamil",
  "aiScore": 85,
  "analysis": "A summary of the call details here...",
  "transcript": [
    {
      "speaker": "Agent",
      "time": "00:00",
      "text": "ஹலோ",
      "translation": "Hello"
    },
    {
      "speaker": "Lead",
      "time": "00:01",
      "text": "அப்ரமேஷ் கேக்குதா?",
      "translation": "Apramesh, can you hear me?"
    }
  ]
}

Ensure the output is valid JSON. Do not include markdown code block syntax (like \`\`\`json) in the response text itself, return only the raw JSON.
`;

      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite"
      ];

      let generateRes: Response | null = null;
      let generateData: any = null;
      let successModel = "";
      let lastError: any = null;

      for (const model of candidateModels) {
        console.log(`[Gemini] Attempting content generation with model: ${model}...`);
        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        try {
          const res = await fetch(generateUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      fileData: {
                        mimeType: "audio/mp3",
                        fileUri: fileUri
                      }
                    },
                    {
                      text: promptText
                    }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Status ${res.status} - ${errText}`);
          }

          generateRes = res;
          generateData = await res.json();
          successModel = model;
          break; // Succeeded! Break out of candidate loop.
        } catch (err: any) {
          console.warn(`[Gemini] Model ${model} failed:`, err.message || err);
          lastError = err;
        }
      }

      // Cleanup file from Gemini storage asynchronously
      fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`, {
        method: "DELETE"
      }).catch(e => console.error("[Gemini] Failed to delete file:", e));

      if (!generateRes || !generateData) {
        throw new Error(`All candidate Gemini models failed. Last error: ${lastError?.message || lastError}`);
      }

      console.log(`[Gemini] Content generation succeeded using model: ${successModel}`);

      const rawText = (generateData.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      
      let parsedResult: any = null;
      try {
        parsedResult = JSON.parse(rawText);
      } catch (e) {
        console.warn("[Gemini] Failed to parse Gemini response as JSON. Attempting to parse flat text...");
        const turns = parseFlatTranscriptToTurns(rawText);
        parsedResult = {
          detectedVoiceLanguage: targetLanguage || "Tamil",
          aiScore: 50,
          analysis: "Auto-parsed from Gemini flat text output.",
          transcript: turns
        };
      }

      // Check if transcript key is a flat string instead of an array
      if (parsedResult && typeof parsedResult.transcript === "string") {
        parsedResult.transcript = parseFlatTranscriptToTurns(parsedResult.transcript);
      }

      const finalTurns = parsedResult.transcript || [];

      return {
        detectedVoiceLanguage: parsedResult.detectedVoiceLanguage || "English",
        aiScore: parsedResult.aiScore || 50,
        analysis: parsedResult.analysis || "",
        transcript: JSON.stringify(finalTurns),
        translatedText: finalTurns
          .map((t: any) => `${t.speaker}: ${t.translation}`)
          .join("\n"),
        wordCount: finalTurns
          .reduce((acc: number, curr: any) => acc + (curr.text || "").split(" ").length, 0)
      };
    }

    const isGroq = apiKey ? apiKey.startsWith("gsk_") : false;

    if (!useLocalWhisper) {
      const fileBlob = new Blob([arrayBuffer], { type: "audio/mp3" });
      const whisperEndpoint = isGroq 
        ? "https://api.groq.com/openai/v1/audio/transcriptions"
        : "https://api.openai.com/v1/audio/transcriptions";
      const whisperModel = isGroq ? "whisper-large-v3-turbo" : "whisper-1";

      console.log(`[Whisper] Submitting audio to ${isGroq ? "Groq" : "OpenAI"} Whisper API (${whisperModel}) with target language: ${targetLanguage}...`);
      const whisperFormData = new FormData();
      whisperFormData.append("file", fileBlob, "call_recording.mp3");
      whisperFormData.append("model", whisperModel);
      whisperFormData.append("response_format", "verbose_json");

      const langMap: Record<string, string> = {
        English: "en",
        Spanish: "es",
        Hindi: "hi",
        Tamil: "ta",
        French: "fr",
        German: "de",
      };
      const isoLang = langMap[targetLanguage];
      if (isoLang) {
        console.log(`[Whisper] Pinning Whisper language parameter to: ${isoLang} (${targetLanguage})`);
        whisperFormData.append("language", isoLang);
      } else {
        console.log(`[Whisper] Omitting language parameter to enable automatic voice language detection.`);
      }

      console.log(`[Whisper] Appending real estate vocabulary prompt in ${targetLanguage} for call transcription.`);
      whisperFormData.append("prompt", whisperPrompt);

      const whisperRes = await fetch(whisperEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperFormData,
      });

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        throw new Error(`Whisper API failure: ${whisperRes.status} - ${errText}`);
      }

      whisperData = await whisperRes.json();
    }
    let rawTranscript = removeRepetitivePhrases(whisperData.text || "");
    console.log(`[Whisper] Raw Transcription (Repetition Filtered): "${rawTranscript}"`);

    // Clean up common Whisper silence hallucinations (e.g. Spanish/English phrases or subtitle credits during silence)
    const hallucinations = [
      /subtitles\s+by\s+amara\.org/i,
      /thank\s+you\s+for\s+watching/i,
      /please\s+subscribe/i,
      /y\s+as[ií]/i,
      /¿?\s*c[oó]mo\s+est[aá]s\s*\??/i,
      /¿?\s*qu[eé]\s+haces\s*\??/i,
      /todos\s+los\s+derechos/i,
      /gracias\s+por\s+ver/i,
      /gracias/i,
      /¿?\s*cómo\s+estás\s*\??/i,
      // Spanish silence hallucinations:
      /¿?\s*t[uú]\s+puedes\s+trabajar\s*\??/gi,
      /¿?\s*no\s+puedes\s+trabajar\s*\??/gi,
      /¿?\s*s[oó]lo\s+r[aá]pido\s*\??/gi,
      /¿?\s*s[oó]\s+r[aá]pido\s*\??/gi,
      /¿?\s*c[oó]mo\s+te\s+encuentras\s+ahora\s+despu[eé]s\s+de\s+un\s+tiempo\s+de\s+trabajo\s*\??/gi,
      /¿?\s*c[oó]mo\s+te\s+encuentras\s*\??/gi,
      /¿?\s*despu[eé]s\s+de\s+un\s+tiempo\s+de\s+trabajo\s*\??/gi,
      /¿?\s*bien\s*\??/gi,
      /¿?\s*as[ií]\s*\??/gi
    ];
    for (const regex of hallucinations) {
      rawTranscript = rawTranscript.replace(regex, "");
    }
    rawTranscript = rawTranscript.trim();
    console.log(`[Whisper] Cleaned Transcription: "${rawTranscript}"`);

    // Format segments with timestamps for LLM speaker classification
    let formattedSegments = "";
    if (whisperData.segments && Array.isArray(whisperData.segments)) {
      let lastTxt = "";
      const cleanedSegments = whisperData.segments.map((seg: any) => {
        let txt = removeRepetitivePhrases(seg.text || "");
        if (txt === lastTxt) return null;
        lastTxt = txt;
        return { ...seg, text: txt };
      }).filter(Boolean);

      formattedSegments = cleanedSegments.map((seg: any) => {
        const formatTime = (secs: number) => {
          const m = Math.floor(secs / 60).toString().padStart(2, "0");
          const s = Math.floor(secs % 60).toString().padStart(2, "0");
          return `${m}:${s}`;
        };
        let txt = seg.text || "";
        for (const regex of hallucinations) {
          txt = txt.replace(regex, "");
        }
        txt = txt.trim();
        if (!txt) return null;

        // Discard low-confidence segments (silence/noise hallucinations) for WebRTC calls
        if (isWebRTC && seg.avg_logprob && seg.avg_logprob < -2.0) {
          console.log(`[Whisper Filter] Discarding segment [${formatTime(seg.start)} - ${formatTime(seg.end)}] due to low avg_logprob (${seg.avg_logprob}): "${txt}"`);
          return null;
        }

        return `[${formatTime(seg.start)}]: "${txt}"`;
      }).filter(Boolean).join("\n");
    }

    if (!formattedSegments) {
      formattedSegments = `[00:00]: "${rawTranscript}"`;
    }
    console.log(`[Whisper] Formatted Segments for LLM:\n${formattedSegments}`);

    if (!isWebRTC) {
      // Find and strip automated greeting by boundary first
      const boundary = findBoundarySplitIndex(rawTranscript);
      if (boundary.index !== -1) {
        const splitPoint = boundary.index + boundary.boundaryLength;
        console.log(`[Parser] Located greeting boundary at index ${boundary.index}. Slicing off system greeting.`);
        rawTranscript = rawTranscript.substring(splitPoint).trim();
      } else {
        console.log(`[Parser] Greeting boundary not found. Falling back to phrase-based cleaning.`);
      }

      // Clean all automated system greeting phrases from the raw transcript so they do not contaminate the Lead's speech
      rawTranscript = cleanGreetingPhrases(rawTranscript, leadName);
      console.log(`[Whisper] Post-Greeting Cleaned Transcription: "${rawTranscript}"`);

      // If there is no speech left after removing the greeting, return a standard "No message left" call log directly
      if (!rawTranscript) {
        const staticAgent = getStaticAgentTurn(targetLanguage, leadName);
        const finalTurns = [
          {
            speaker: "Agent",
            text: staticAgent.text,
            translation: staticAgent.translation,
            time: "00:02"
          }
        ];
        return {
          detectedVoiceLanguage: targetLanguage,
          translatedLanguage: "English",
          transcript: JSON.stringify(finalTurns),
          translatedText: `Agent: ${staticAgent.translation}`,
          wordCount: 0,
          analysis: "The call was answered, but the lead hung up without leaving a message.",
          aiScore: 10,
        };
      }
    }

    if (skipLlm) {
      console.log("[Local Whisper] Skipping LLM analysis as requested. Formatting transcript directly...");
      
      let finalTurns: any[] = [];
      let translatedText = "";
      
      if (!isWebRTC) {
        const staticAgent = getStaticAgentTurn(targetLanguage, leadName);
        finalTurns = [
          {
            speaker: "Agent",
            text: staticAgent.text,
            translation: staticAgent.translation,
            time: "00:02"
          }
        ];
        if (rawTranscript) {
          finalTurns.push({
            speaker: "Lead",
            text: rawTranscript,
            translation: rawTranscript,
            time: "00:08"
          });
        }
        translatedText = `Agent: ${staticAgent.translation}\nLead: ${rawTranscript}`;
      } else {
        const formatTime = (secs: number) => {
          const m = Math.floor(secs / 60).toString().padStart(2, "0");
          const s = Math.floor(secs % 60).toString().padStart(2, "0");
          return `${m}:${s}`;
        };
        
        let lastTxt = "";
        const cleanedSegments = (whisperData?.segments || []).map((seg: any) => {
          let txt = removeRepetitivePhrases(seg.text || "");
          if (txt === lastTxt) return null;
          lastTxt = txt;
          return { ...seg, text: txt };
        }).filter(Boolean);

        finalTurns = cleanedSegments.map((seg: any, idx: number) => {
          let txt = seg.text || "";
          for (const regex of hallucinations) {
            txt = txt.replace(regex, "");
          }
          return {
            speaker: idx % 2 === 0 ? "Agent" : "Lead",
            text: txt.trim(),
            translation: txt.trim(),
            time: formatTime(seg.start || 0)
          };
        }).filter((t: any) => t.text.length > 0);
        
        if (finalTurns.length === 0 && rawTranscript) {
          finalTurns = [
            {
              speaker: "Lead",
              text: rawTranscript,
              translation: rawTranscript,
              time: "00:00"
            }
          ];
        }
        
        translatedText = finalTurns.map((t: any) => `${t.speaker}: ${t.translation}`).join("\n");
      }
      
      return {
        detectedVoiceLanguage: targetLanguage,
        translatedLanguage: "English",
        transcript: JSON.stringify(finalTurns),
        translatedText: translatedText,
        wordCount: rawTranscript.split(/\s+/).filter(Boolean).length,
        analysis: "Local Whisper transcription completed. LLM analysis bypassed.",
        aiScore: 50
      };
    }

    // Since we've cleaned the greeting, the remaining rawTranscript is entirely the Lead's speech.
    // We can pre-split this programmatically.
    let preSplitTranscript = null;
    let leadText = rawTranscript;

    if (!isWebRTC) {
      const staticAgent = getStaticAgentTurn(targetLanguage, leadName);
      const turns = [
        { speaker: "Agent", text: staticAgent.text, translation: staticAgent.translation, time: "00:02" }
      ];
      if (leadText) {
        turns.push({ speaker: "Lead", text: leadText, translation: "", time: "00:08" });
      }
      preSplitTranscript = turns;
      console.log(`[Parser] Deterministically set transcription to Agent and Lead turns. Lead text: "${leadText}"`);
    }

    let prompt = "";
    if (preSplitTranscript) {
      const staticAgent = getStaticAgentTurn(targetLanguage, leadName);
      prompt = `You are a CRM call analyzer. The phone call consists of:
1. An automated system greeting in language "${targetLanguage}":
   - Original Speech: "${staticAgent.text}"
   - English Translation: "${staticAgent.translation}"
2. A recording of the Lead's speech:
   - Spoken Speech: "${leadText}"

Please perform the following operations:
1. Translate the Lead's speech into fluent English, regardless of what language they actually spoke. Save this translation under the "translatedLeadText" key.
   - PHONETIC & CONTEXT CORRECTION: Whisper transcriptions of regional languages often contain garbled words, homophones, or phonetic transcription errors due to accent/audio quality (e.g. transcribing "மாப்பிள்ளை" as "வப்பில்" or "கூப்பிட்டாய்/அழைத்தாய்" as "அழைத்துவிட்டோய்"). You MUST use the conversational context of the call to correct these minor transcription anomalies so the English translation is accurate, natural, logical, and captures the true intended meaning.
2. Transliterate/convert the Lead's speech to its proper native script under the "nativeLeadText" key:
   - Note that the Lead may have responded in ANY language (Tamil, Hindi, English, Spanish, French, German, or a mixture of these), regardless of the targetLanguage of the system greeting.
   - You MUST detect the actual language spoken by the Lead.
   - If the Lead's speech is transcribed using characters of a different script than the actual language spoken (e.g. Hindi spoken words transcribed as Tamil characters like "ஆப் கைசே ஹோ" or "ஆப் கைசே ஹைன்"), or if it is transcribed in Romanized/Latin script (e.g. "kaise ho" or "post pönitinkilä"), you MUST convert/transliterate it into the proper native script of that language (e.g. Hindi Devanagari "कैसे हो" / "कैसे हैं", or Tamil script "போஸ்ட் பண்ணிட்டீங்களா").
   - If the Lead's speech is already in its proper native script or is English, copy it exactly as is, but correct any minor phonetic spelling errors or garbled words to their proper native words.
   - Do NOT translate this key to English; it must represent the spoken words in the native language's script.
3. Detect the primary language of the Lead's speech and populate the "detectedVoiceLanguage" key (e.g., "Tamil", "Hindi", "English", "Spanish", "French", "German", etc.).
4. Extract the customer's specific requirements from the call (e.g., what services, features, pricing, support seats, or timeline they need). Do not write a general summary or analysis; focus purely on listing their explicit requirements as a clean bulleted list of points (using *).
5. Calculate a quality score (0 to 100) representing the lead's level of interest or business qualification.

Return ONLY a raw JSON object (do not wrap in markdown fences like \`\`\`json) matching the following TypeScript interface:
{
  "detectedVoiceLanguage": string,
  "translatedLeadText": string, // English translation of the Lead's speech
  "nativeLeadText": string, // Lead's speech in its proper native script
  "analysis": string,
  "aiScore": number
}`;
    } else if (isWebRTC) {
      prompt = `You are a CRM call analyzer. We have a list of transcribed audio segments with start timestamps from a real live WebRTC phone call between Agent "${agentName}" and Lead "${leadName}".
The call is conducted in the target language "${targetLanguage}", and may contain a mixture of English and "${targetLanguage}".

Segments with timestamps:
${formattedSegments}

Please perform the following operations:
1. Parse this transcript into a JSON array of dialogue turns. Assign each turn to either "Agent" or "Lead" by classifying the speaker of each timestamped segment based on the conversation flow. Group consecutive segments from the same speaker together into a single turn, preserving the initial time marker of the first segment.
   CRITICAL COMPLETENESS RULE: Every single spoken word, sentence, and segment in the list above MUST be represented in the output turns, EXCEPT for any segments that are Whisper hallucinations or static noise. Do NOT summarize, truncate, or omit any actual spoken words from the real dialogue turns. If there is a transition of language or speaker, split it into a separate turn.
   CRITICAL SPEAKER ASSIGNMENT RULES:
   - The call is an outbound connection initiated by Agent "${agentName}" to Lead "${leadName}". The very first turn is spoken by the Agent.
   - PHONETIC NAME ERRORS: Whisper often transcribes regional names phonetically as common words (e.g. transcribing the lead name "Pranesh" as "Français" or "French" or "Pramesh"). You must recognize these homophone errors.
   - For example: if one speaker asks "Hello, is this Français?" or "Hello, is this Pranesh?", that is the Agent verifying the customer's identity. The speaker replying "Yes, this is Français/Pranesh. What is the matter?" is the Lead. Do not swap these roles.
2. In the "text" key, keep/reconstruct what the speakers originally said in their native spoken language (e.g., using proper Tamil script for Tamil turns/phrases, English for English turns), representing a natural code-switched business call. Correct any phonetic transcription errors or spelling mistakes (e.g., "Pramesh" -> "Pranesh").
   - Under NO circumstances should you translate the "text" key to English if the original speech was in another language.
3. In the "translation" key, provide a clean, fluent English translation of that turn. If the turn is already in English, copy the text exactly into the "translation" key.
4. Detect the primary language of the Lead's speech and populate the "detectedVoiceLanguage" key (e.g., "Tamil", "Hindi", "English", "Spanish", "French", "German", etc.).
5. Extract the customer's specific requirements from the call (e.g., what services, features, pricing, support seats, or timeline they need). Do not write a general summary or analysis; focus purely on listing their explicit requirements as a clean bulleted list of points (using *).
6. Calculate a quality score (0 to 100) representing the lead's level of interest or business qualification.

Return ONLY a raw JSON object (do not wrap in markdown fences like \`\`\`json) matching the following TypeScript interface:
{
  "detectedVoiceLanguage": string,
  "translatedLanguage": "English",
  "transcript": string, // JSON string representation of: Array<{ speaker: "Agent" | "Lead", text: string, translation: string, time: string }>
  "translatedText": string, // Text paragraph of the English-translated dialogue
  "wordCount": number, // total words in transcription
  "analysis": string,
  "aiScore": number
}`;
    } else {
      prompt = `You are a CRM call analyzer. We have a raw transcription of a real phone call between Agent "${agentName}" and Lead "${leadName}".
The call system greeting was conducted in the language "${targetLanguage}", but the Lead may have responded in English, Tamil, Hindi, Spanish, French, German, or a mixture of these.
Raw transcription:
"${rawTranscript}"

Please perform the following operations:
1. Parse this transcript into a JSON array of dialogue turns. Assign each turn to either "Agent" or "Lead" based on conversational context. Provide an approximated time marker format "MM:SS" (e.g. 00:02, 00:08) reflecting the natural speed of conversation.
   CRITICAL COMPLETENESS RULE: Every single sentence, phrase, and word in the raw transcription MUST be represented in the output turns. Do NOT summarize, truncate, or omit any spoken words from the dialogue turns. If there is a transition of language or speaker, split it into a separate turn.
   CRITICAL SPEAKER ASSIGNMENT RULES:
   - The automated Agent's system speech (trial warning and system greeting) ALWAYS ends with the phrase "Hang up when you are finished" or its translation in other languages (such as "தொங்கவிடவும்", "cuelgue cuando termine", "फोन काट दें", "raccrochez lorsque vous avez terminé", "legen Sie auf, wenn Sie fertig sind"). You MUST assign this system warning and greeting to the "Agent".
   - Every single word, sentence, and phrase in the raw transcription that occurs AFTER "Hang up when you are finished" (or its translation) is spoken by the "Lead" (the caller). You MUST assign ALL of these subsequent turns to the "Lead". Under no circumstances should you assign any of the speech after the automated greeting ends to the "Agent".
2. Populate the "text" key with the spoken words in their proper native script:
   - Note that the Lead may have responded in ANY language, regardless of targetLanguage. You MUST detect the actual language spoken by the Lead.
   - If any spoken words are transcribed using characters of a different script than the actual language spoken (e.g. Hindi spoken words transcribed as Tamil characters like "ஆப் கைசே ஹோ" or "ஆப் கைசே ஹைன்"), or if they are transcribed in Romanized/Latin characters (e.g. 'kaise ho' or 'post pönitinkilä'), you MUST convert/transliterate them into their proper native script (e.g. Devanagari 'कैसे हो' / 'कैसे हैं', or Tamil 'போஸ்ட் பண்ணிட்டீங்களா') for the "text" key.
   - If the Lead's speech contains minor phonetic spelling errors, typos, or garbled words due to accent/audio quality, correct them to their proper native words.
   - Under NO circumstances should you translate the "text" key to English.
3. Detect the language of the turn. If it is in a foreign language (like Tamil, Hindi, Spanish, French, German, etc.), provide an accurate English translation for that turn under the "translation" key.
   - PHONETIC & CONTEXT CORRECTION: When translating, if the native transcript contains minor phonetic errors or garbled words, use conversational context to correct the translation so that it is fluent, accurate, and reflects the true intended meaning.
   - If the turn is already in English, copy the text exactly into the "translation" key.
4. Detect the primary language of the Lead's speech and populate the "detectedVoiceLanguage" key (e.g., "Tamil", "Hindi", "English", "Spanish", "French", "German", etc.).
5. Extract the customer's specific requirements from the call (e.g., what services, features, pricing, support seats, or timeline they need). Do not write a general summary or analysis; focus purely on listing their explicit requirements as a clean bulleted list of points (using *).
6. Calculate a quality score (0 to 100) representing the lead's level of interest or business qualification.

Return ONLY a raw JSON object (do not wrap in markdown fences like \`\`\`json) matching the following TypeScript interface:
{
  "detectedVoiceLanguage": string, // e.g. "Tamil", "Hindi", "English", "Spanish", "French", "German", etc.
  "translatedLanguage": "English",
  "transcript": string, // JSON string representation of: Array<{ speaker: "Agent" | "Lead", text: string, translation: string, time: string }>
  "translatedText": string, // Text paragraph of the English-translated dialogue
  "wordCount": number, // total words in transcription
  "analysis": string,
  "aiScore": number
}`;
    }

    const chatEndpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const chatModel = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

    const chatRes = await fetch(chatEndpoint, {
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

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      throw new Error(`Chat Completions API failure: ${chatRes.status} - ${errText}`);
    }

    const chatData = await chatRes.json();
    let content = chatData.choices[0].message.content.trim();

    // Clean markdown brackets if present
    content = content.replace(/^```json/, "").replace(/```$/, "").trim();
    
    // Extract only the JSON block (ignores any trailing/leading chat explanations or notes)
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseErr: any) {
      console.warn("Initial JSON parse failed, trying to sanitize escapes...", parseErr.message);
      try {
        // Clean up common bad backslashes or invalid unicode escapes
        const sanitized = content
          .replace(/\\u([0-9a-fA-F]{0,3})[^0-9a-fA-F]/g, "") // remove malformed short \u escapes
          .replace(/\\(?!["\\/bfnrtu])/g, "\\\\"); // double-escape any invalid backslashes
        parsedResult = JSON.parse(sanitized);
      } catch (secondErr: any) {
        throw new Error(`Failed to parse GPT response JSON: ${secondErr.message}. Raw output was: ${content}`);
      }
    }

    if (preSplitTranscript) {
      const staticAgent = getStaticAgentTurn(targetLanguage, leadName);
      const leadTranslation = parsedResult.translatedLeadText || parsedResult.translatedText || "";
      const leadTextConverted = parsedResult.nativeLeadText || leadText;
      const finalTurns = [
        {
          speaker: "Agent",
          text: staticAgent.text,
          translation: staticAgent.translation,
          time: "00:02"
        }
      ];
      if (leadTextConverted) {
        finalTurns.push({
          speaker: "Lead",
          text: leadTextConverted,
          translation: leadTranslation,
          time: "00:08"
        });
      }

      return {
        detectedVoiceLanguage: parsedResult.detectedVoiceLanguage || targetLanguage,
        translatedLanguage: "English",
        transcript: JSON.stringify(finalTurns),
        translatedText: `Agent: ${staticAgent.translation}\nLead: ${leadTranslation}`,
        wordCount: rawTranscript.split(/\s+/).filter(Boolean).length,
        analysis: parsedResult.analysis || "Call recording completed.",
        aiScore: parsedResult.aiScore || 70,
      };
    }

    // Post-process the transcript turns to ensure the Agent's greeting text and translation are always accurate and not hallucinated
    try {
      let transcriptObj = typeof parsedResult.transcript === "string"
        ? JSON.parse(parsedResult.transcript)
        : parsedResult.transcript;

      if (Array.isArray(transcriptObj) && !isWebRTC) {
        const staticAgent = getStaticAgentTurn(targetLanguage, leadName);
        transcriptObj = transcriptObj.map((turn: any) => {
          if (turn.speaker === "Agent") {
            return {
              ...turn,
              text: staticAgent.text,
              translation: staticAgent.translation
            };
          }
          return turn;
        });
        parsedResult.transcript = JSON.stringify(transcriptObj);
      }
    } catch (e) {
      console.warn("Failed to post-process transcript turns:", e);
    }

    return {
      detectedVoiceLanguage: parsedResult.detectedVoiceLanguage || "English",
      translatedLanguage: "English",
      transcript: typeof parsedResult.transcript === "string" ? parsedResult.transcript : JSON.stringify(parsedResult.transcript),
      translatedText: parsedResult.translatedText || rawTranscript,
      wordCount: parsedResult.wordCount || rawTranscript.split(/\s+/).filter(Boolean).length,
      analysis: parsedResult.analysis || "Call recording completed.",
      aiScore: parsedResult.aiScore || 70,
    };
  } catch (error) {
    console.error("Error in transcribeAndAnalyzeRecording:", error);
    throw error;
  }
}

/**
 * Generates a consolidated overall summary based on all call logs of a lead.
 */
export async function generateOverallSummaryFromLLM(
  leadName: string,
  companyName: string | null,
  calls: any[]
): Promise<string> {
  try {
    const callsText = calls.map((call, index) => {
      const turns = (() => {
        try {
          const parsed = JSON.parse(call.transcript || "[]");
          if (Array.isArray(parsed)) {
            return parsed.map((t: any) => `${t.speaker}: ${t.text}`).join("\n");
          }
        } catch (_) {}
        return call.translatedText || call.transcript || "";
      })();
      return `Call #${index + 1} (${new Date(call.createdAt).toLocaleDateString()}):
Duration: ${call.duration} seconds
Stage/Outcome: ${call.stage}
Requirements/Summary: ${call.analysis || "None"}
Transcript turns:
${turns}`;
    }).join("\n\n---\n\n");

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      console.log("[Gemini] Generating overall summary...");
      const promptText = `You are a professional BPO client manager and CRM assistant.
We have conducted ${calls.length} phone calls with a client named "${leadName}" (Company: "${companyName || "Unknown"}").
Here is the history of all call details and transcripts:

${callsText}

Please analyze the call history and generate a consolidated overall summary across all calls.
You must strictly follow this format:
1. A single concise paragraph summarizing the calls, relationship progression, and status.
2. A bulleted list of all client requirements gathered across all calls.

Do not include any extra sections, timelines, action plans, or introductions. Keep it short, focused, and professional.`;

      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite"
      ];

      let generateRes: Response | null = null;
      let generateData: any = null;
      let successModel = "";
      let lastError: any = null;

      for (const model of candidateModels) {
        console.log(`[Gemini] Attempting overall summary generation with model: ${model}...`);
        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        try {
          const res = await fetch(generateUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: promptText
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.2
              }
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Status ${res.status} - ${errText}`);
          }

          generateRes = res;
          generateData = await res.json();
          successModel = model;
          break; // Succeeded! Break out of candidate loop.
        } catch (err: any) {
          console.warn(`[Gemini] Model ${model} overall summary generation failed:`, err.message || err);
          lastError = err;
        }
      }

      if (generateRes && generateData) {
        console.log(`[Gemini] Overall summary generation succeeded using model: ${successModel}`);
        return generateData.candidates[0].content.parts[0].text.trim();
      } else {
        console.error(`All candidate Gemini models failed to generate overall summary. Last error: ${lastError?.message || lastError}`);
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return calls.map((c, i) => `[Call #${i+1}]: ${c.analysis || "No requirements recorded."}`).join("\n\n");
    }

    const isGroq = apiKey.startsWith("gsk_");
    const chatEndpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const chatModel = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

    console.log(`[LLM] Generating overall summary using ${chatModel}...`);
    const promptText = `You are a professional BPO client manager and CRM assistant.
We have conducted ${calls.length} phone calls with a client named "${leadName}" (Company: "${companyName || "Unknown"}").
Here is the history of all call details and transcripts:

${callsText}

Please analyze the call history and generate a consolidated overall summary across all calls.
You must strictly follow this format:
1. A single concise paragraph summarizing the calls, relationship progression, and status.
2. A bulleted list of all client requirements gathered across all calls.

Do not include any extra sections, timelines, action plans, or introductions. Keep it short, focused, and professional.`;

    const chatRes = await fetch(chatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chatModel,
        messages: [
          { role: "system", content: "You are a professional sales manager. Summarize the caller's history clearly." },
          { role: "user", content: promptText }
        ],
        temperature: 0.2,
        max_tokens: 1000
      }),
    });

    if (chatRes.ok) {
      const chatData = await chatRes.json();
      return chatData.choices[0].message.content.trim();
    } else {
      const errText = await chatRes.text();
      throw new Error(`LLM Error: ${chatRes.status} - ${errText}`);
    }
  } catch (error: any) {
    console.error("Error in generateOverallSummaryFromLLM:", error);
    return `Failed to generate overall summary: ${error.message || error}`;
  }
}

export function startOfflineRetranscription(id: string) {
  const job = retranscribeJobs.get(id);
  if (job && job.status === "running") {
    return;
  }

  // Initialize/reset job state
  const currentJob: {
    status: "running" | "done" | "error";
    logs: string[];
    error?: string;
    duration?: string;
  } = {
    status: "running",
    logs: [`[System] Initiating offline retranscription for call ID: ${id}...`],
  };
  retranscribeJobs.set(id, currentJob);

  // Start background processing - DO NOT await it so we return immediately
  (async () => {
    try {
      const startTime = Date.now();
      const { prisma } = require("@/lib/db");
      
      // Wrap transcription in AsyncLocalStorage to capture console.logs
      await transcriptionLogStorage.run(
        (msg) => {
          currentJob.logs.push(msg);
        },
        async () => {
          try {
            // 1. Fetch Call log
            const call = await prisma.callLog.findUnique({
              where: { id },
              include: { lead: true, user: true },
            });

            if (!call) {
              currentJob.status = "error";
              currentJob.error = "Call log not found in database.";
              currentJob.logs.push(`[ERROR] ${currentJob.error}`);
              return;
            }

            let audioUrl = call.audioUrl;
            
            if (!audioUrl || !audioUrl.startsWith("http") || audioUrl.includes("processed")) {
              currentJob.logs.push(`[System] Audio URL missing or placeholder. Attempting to fetch recording from provider APIs...`);
              
              const sipConfig = await prisma.sipTrunkConfig.findFirst({
                where: { isActive: true }
              });
              const provider = sipConfig?.telephonyProvider || "TWILIO";
              
              if (provider === "PLIVO") {
                const authId = sipConfig?.plivoAuthId || process.env.PLIVO_AUTH_ID || "";
                const authToken = sipConfig?.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "";
                
                if (authId && authToken) {
                  currentJob.logs.push(`[Plivo] Checking recordings for call UUID: ${call.jobId}...`);
                  const plivoRes = await fetch(`https://api.plivo.com/v1/Account/${authId}/Recording/?call_uuid=${call.jobId}`, {
                    headers: {
                      Authorization: "Basic " + Buffer.from(`${authId}:${authToken}`).toString("base64")
                    }
                  });
                  if (plivoRes.ok) {
                    const plivoData = await plivoRes.json();
                    if (plivoData.objects && plivoData.objects.length > 0) {
                      audioUrl = plivoData.objects[0].recording_url;
                      currentJob.logs.push(`[Plivo] Found recording: ${audioUrl}`);
                      
                      // Save it to callLog so we don't have to fetch it again next time
                      await prisma.callLog.update({
                        where: { id },
                        data: { audioUrl }
                      });
                    } else {
                      currentJob.logs.push(`[Plivo] No recordings found for call UUID: ${call.jobId}`);
                    }
                  } else {
                    currentJob.logs.push(`[Plivo] Failed to query recordings API: ${plivoRes.status} ${plivoRes.statusText}`);
                  }
                } else {
                  currentJob.logs.push(`[System] Plivo credentials not configured.`);
                }
              } else {
                // Twilio
                const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
                const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
                
                if (twilioSid && twilioToken) {
                  currentJob.logs.push(`[Twilio] Checking recordings for call SID: ${call.jobId}...`);
                  const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Recordings.json?CallSid=${call.jobId}`, {
                    headers: {
                      Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")
                    }
                  });
                  if (twilioRes.ok) {
                    const twilioData = await twilioRes.json();
                    if (twilioData.recordings && twilioData.recordings.length > 0) {
                      const recording = twilioData.recordings[0];
                      audioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Recordings/${recording.sid}.mp3`;
                      currentJob.logs.push(`[Twilio] Found recording: ${audioUrl}`);
                      
                      // Save it to callLog
                      await prisma.callLog.update({
                        where: { id },
                        data: { audioUrl }
                      });
                    } else {
                      currentJob.logs.push(`[Twilio] No recordings found for call SID: ${call.jobId}`);
                    }
                  } else {
                    currentJob.logs.push(`[Twilio] Failed to query recordings API: ${twilioRes.status} ${twilioRes.statusText}`);
                  }
                } else {
                  currentJob.logs.push(`[System] Twilio credentials not configured.`);
                }
              }
            }

            if (!audioUrl || !audioUrl.startsWith("http") || audioUrl.includes("processed")) {
              currentJob.status = "error";
              currentJob.error = "This call has no audio recording URL available yet.";
              currentJob.logs.push(`[ERROR] ${currentJob.error}`);
              return;
            }

            currentJob.logs.push(`[System] Fetching audio from: ${audioUrl}`);

            // 2. Invoke transcription
            const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
            const leadName = call.lead?.name || "Client";
            const agentName = call.user?.name || "Sales Rep";
            const targetLanguage = call.detectedVoiceLanguage || "Tamil";
            
            const result = await transcribeAndAnalyzeRecording(
              audioUrl,
              apiKey,
              leadName,
              agentName,
              targetLanguage,
              false // isWebRTC
            );

            // 3. Update the database
            currentJob.logs.push("[System] Updating call log in database with new transcription...");
            const updated = await prisma.callLog.update({
              where: { id },
              data: {
                audioUrl,
                transcript: result.transcript,
                translatedText: result.translatedText,
                detectedVoiceLanguage: result.detectedVoiceLanguage,
                translatedLanguage: result.translatedLanguage,
                wordCount: result.wordCount,
                analysis: result.analysis,
                aiScore: result.aiScore,
                notes: `Retranscribed offline using local Whisper model. Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
              }
            });

            const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
            currentJob.status = "done";
            currentJob.duration = durationSec;
            currentJob.logs.push(`[System] Retranscription complete in ${durationSec}s!`);
          } catch (err: any) {
            console.error("Retranscribe background task error:", err);
            currentJob.status = "error";
            currentJob.error = err.message || "An unexpected error occurred during retranscription.";
            currentJob.logs.push(`[ERROR] ${currentJob.error}`);
          }
        }
      );
    } catch (err: any) {
      console.error("Failed to run transcriptionLogStorage:", err);
      currentJob.status = "error";
      currentJob.error = err.message || "Failed to initialize log storage.";
      currentJob.logs.push(`[ERROR] ${currentJob.error}`);
    }
  })();
}
