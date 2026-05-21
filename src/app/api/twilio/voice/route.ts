import { NextResponse } from "next/server";

export async function POST() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! This is a secure voice call from your Virpanix Intelligent CRM SIP Trunk. Connecting you to your agent now.</Say>
  <Play>http://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

  return new Response(twiml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

export async function GET() {
  return POST();
}
