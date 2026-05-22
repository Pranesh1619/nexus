export interface DialogueTurn {
  speaker: "Agent" | "Lead";
  time: string;
  text: string;
  translation: string;
}

export interface ConversationResult {
  detectedVoiceLanguage: string;
  translatedLanguage: string;
  transcript: string; // JSON string of DialogueTurn[]
  translatedText: string; // Text paragraph in English
  wordCount: number;
  analysis: string;
  aiScore: number;
}

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
  }
};

/**
 * Returns structured dialogue turns and metrics based on parameters.
 */
export function generateConversation(
  leadName: string,
  companyName: string,
  agentName: string,
  language: string,
  stage: string
): ConversationResult {
  const selectedLang = DIALOGUES_DATA[language] ? language : "English";
  
  // Map stage to group: positive, negative, or neutral
  let group: "positive" | "neutral" | "negative" = "neutral";
  if (["Interested", "Qualified", "Closed", "Desire"].includes(stage)) {
    group = "positive";
  } else if (stage === "Not Interested" || stage === "FAILED") {
    group = "negative";
  }

  const dataset = DIALOGUES_DATA[selectedLang][group];
  const turns = dataset.turns(leadName, companyName, agentName);
  const analysisText = dataset.analysis(leadName, companyName);
  
  // Format translated text paragraph
  const translatedText = turns
    .map(turn => `${turn.speaker}: "${turn.translation}"`)
    .join("\n\n");

  // Word count of the transcript
  const rawTextParagraph = turns.map(t => t.text).join(" ");
  const wordCount = rawTextParagraph.split(/\s+/).filter(Boolean).length;

  return {
    detectedVoiceLanguage: selectedLang,
    translatedLanguage: "English",
    transcript: JSON.stringify(turns),
    translatedText,
    wordCount,
    analysis: analysisText,
    aiScore: dataset.aiScore
  };
}

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
    "போனை தொங்கவிடவும்",
    "தொங்கவிடவும்"
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
 * Downloads the actual audio from Twilio's public RecordingUrl, sends it to OpenAI Whisper,
 * and formats/translates/summarizes the conversation using GPT-4o-mini.
 */
export async function transcribeAndAnalyzeRecording(
  recordingUrl: string,
  apiKey: string,
  leadName: string,
  agentName: string,
  targetLanguage: string = "English"
) {
  try {
    console.log(`[Whisper] Downloading call recording from: ${recordingUrl}`);
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
    const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
    const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

    const audioRes = await fetch(recordingUrl, {
      headers: {
        Authorization: authHeader
      }
    });
    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio from Twilio: ${audioRes.status} ${audioRes.statusText}`);
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: "audio/wav" });

    const isGroq = apiKey.startsWith("gsk_");
    const whisperEndpoint = isGroq 
      ? "https://api.groq.com/openai/v1/audio/transcriptions"
      : "https://api.openai.com/v1/audio/transcriptions";
    const whisperModel = isGroq ? "whisper-large-v3" : "whisper-1";

    console.log(`[Whisper] Submitting audio to ${isGroq ? "Groq" : "OpenAI"} Whisper API (${whisperModel}) with target language: ${targetLanguage}...`);
    const whisperFormData = new FormData();
    whisperFormData.append("file", fileBlob, "call_recording.wav");
    whisperFormData.append("model", whisperModel);

    // Provide a rich multilingual prompt so Whisper transcribes whichever language is spoken (English, Tamil, Hindi, Spanish, French, German) in its native script
    const whisperPrompt = `தமிழ்: இது ஒரு வாடிக்கையாளர் அழைப்பு. நான் தமிழ் பேசுகிறேன். நீங்கள் எப்படி இருக்கிறீர்கள்?
हिन्दी: यह एक ग्राहक कॉल है। मैं हिंदी बोलता हूँ। आप कैसे हैं?
Español: Esta es una llamada de cliente. Hablo español. ¿Cómo estás?
Français: C'est un appel client. Je parle français. Comment ça va?
Deutsch: Dies ist ein Kundenanruf. Ich spreche Deutsch. Wie geht es Ihnen?
English: This is a customer call. You have a trial account.`;
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

    const whisperData = await whisperRes.json();
    const rawTranscript = whisperData.text;
    console.log(`[Whisper] Raw Transcription: "${rawTranscript}"`);

    // Deterministically pre-split the raw transcription into Agent (automated system greeting) and Lead turns.
    const { index: boundaryIndex, boundaryLength } = findBoundarySplitIndex(rawTranscript);
    let preSplitTranscript = null;

    if (boundaryIndex !== -1) {
      const boundaryEnd = boundaryIndex + boundaryLength;
      const agentText = rawTranscript.slice(0, boundaryEnd).trim();
      let leadText = rawTranscript.slice(boundaryEnd).trim();

      // Clean leading punctuation and spaces from leadText
      leadText = leadText.replace(/^[\s.,\/#!$%\^&\*;:{}=\-_`~()?]+/, "");

      const turns = [
        { speaker: "Agent", text: agentText, translation: "", time: "00:02" }
      ];
      if (leadText) {
        turns.push({ speaker: "Lead", text: leadText, translation: "", time: "00:08" });
      }
      preSplitTranscript = turns;
      console.log(`[Parser] Deterministically pre-split transcription into Agent and Lead turns. Lead text: "${leadText}"`);
    } else {
      console.log(`[Parser] No system greeting boundary found. Falling back to LLM-based turn parsing.`);
    }

    let prompt = "";
    if (preSplitTranscript) {
      prompt = `You are a CRM call analyzer. We have a pre-split transcription of a phone call between Agent "${agentName}" and Lead "${leadName}".
The primary language of the call is "${targetLanguage}".
Here is the JSON array representing the dialogue turns:
${JSON.stringify(preSplitTranscript, null, 2)}

Please perform the following operations:
1. For each turn in the JSON array, translate the "text" key into English if it is in a foreign language (such as Tamil, Hindi, Spanish, French, German). Populate the "translation" key with this English translation. If the text is already in English, copy it exactly into the "translation" key.
   CRITICAL RULE: Under NO circumstances should you translate or modify the "text" key. The "text" key must preserve the original language and script exactly as provided.
2. Detect the primary language of the Lead's speech and populate the "detectedVoiceLanguage" key (e.g., "Tamil", "Hindi", "English", "Spanish", etc.).
3. Write a professional CRM call analysis summarizing the discussion, client objections, and proposed follow-up steps.
4. Calculate a quality score (0 to 100) representing the lead's level of interest or business qualification.

Return ONLY a raw JSON object (do not wrap in markdown fences like \`\`\`json) matching the following TypeScript interface:
{
  "detectedVoiceLanguage": string,
  "translatedLanguage": "English",
  "transcript": string, // JSON string representation of the updated transcript array (with filled "translation" fields)
  "translatedText": string, // Text paragraph of the English-translated dialogue
  "wordCount": number, // total words in transcription
  "analysis": string,
  "aiScore": number
}`;
    } else {
      prompt = `You are a CRM call analyzer. We have a raw transcription of a real phone call between Agent "${agentName}" and Lead "${leadName}".
The call was conducted in the language "${targetLanguage}".
Raw transcription:
"${rawTranscript}"

Please perform the following operations:
1. Parse this transcript into a JSON array of dialogue turns. Assign each turn to either "Agent" or "Lead" based on conversational context. Provide an approximated time marker format "MM:SS" (e.g. 00:02, 00:08) reflecting the natural speed of conversation.
   CRITICAL COMPLETENESS RULE: Every single sentence, phrase, and word in the raw transcription MUST be represented in the output turns. Do NOT summarize, truncate, or omit any spoken words from the dialogue turns. If there is a transition of language or speaker, split it into a separate turn.
   CRITICAL SPEAKER ASSIGNMENT RULES:
   - The automated Agent's system speech (trial warning and system greeting) ALWAYS ends with the phrase "Hang up when you are finished" or its translation in other languages (such as "தொங்கவிடவும்", "cuelgue cuando termine", "फोन काट दें", "raccrochez lorsque vous avez terminé", "legen Sie auf, wenn Sie fertig sind"). You MUST assign this system warning and greeting to the "Agent".
   - Every single word, sentence, and phrase in the raw transcription that occurs AFTER "Hang up when you are finished" (or its translation) is spoken by the "Lead" (the caller). You MUST assign ALL of these subsequent turns to the "Lead". Under no circumstances should you assign any of the speech after the automated greeting ends to the "Agent".
2. Populate the "text" key with the EXACT original words and script (whether English, Tamil, Hindi, Spanish, etc.) as they appear in the raw transcription for that dialogue turn. Under NO circumstances should you translate or convert the script of the raw transcription into a different language for the "text" key.
3. Detect the language of the turn. If it is in a foreign language (like Tamil, Hindi, Spanish, French, German, etc.), provide an accurate English translation for that turn under the "translation" key. If the turn is already in English, copy the text exactly into the "translation" key.
4. Write a professional CRM call analysis summarizing the discussion, client objections, and proposed follow-up steps.
5. Calculate a quality score (0 to 100) representing the lead's level of interest or business qualification.

Return ONLY a raw JSON object (do not wrap in markdown fences like \`\`\`json) matching the following TypeScript interface:
{
  "detectedVoiceLanguage": string, // e.g. "${targetLanguage}", "English", "Spanish", "Hindi", etc.
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
