import { NextResponse } from "next/server";
import twilio from "twilio";

export async function GET(request: Request) {
  try {
    const useRealTwilio = process.env.USE_REAL_TWILIO === "true";

    if (!useRealTwilio) {
      // In mock/simulated mode, return dummy credentials
      console.log("[Twilio Token] Returning mock token for simulator mode");
      return NextResponse.json({ token: "mock_token_key_abc123xyz", identity: "mock_agent" });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      console.error("[Twilio Token] Missing credentials in environment variables.");
      return NextResponse.json(
        {
          error:
            "Missing Twilio credentials. Please make sure TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_TWIML_APP_SID are configured in your .env file."
        },
        { status: 500 }
      );
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create an identity for the active agent browser session
    const identity = `agent_web_${Math.floor(Math.random() * 100000)}`;

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity,
      ttl: 3600 // Valid for 1 hour
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true // Allow receiving incoming calls in browser too
    });
    
    token.addGrant(voiceGrant);

    console.log(`[Twilio Token] Generated WebRTC access token successfully for identity: ${identity}`);
    return NextResponse.json({ token: token.toJwt(), identity });
  } catch (err: any) {
    console.error("[Twilio Token] Error generating Access Token:", err);
    return NextResponse.json({ error: err.message || "Failed to generate token" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
