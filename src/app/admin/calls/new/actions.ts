"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import twilio from "twilio";

export async function saveCallLog(data: {
  leadId: string;
  userId: string;
  duration: number;
  status: string;
  stage: string;
  transcript: string;
  analysis: string;
}) {
  let finalUserId = data.userId;
  if (finalUserId === "placeholder") {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) finalUserId = firstUser.id;
  }

  const call = await prisma.callLog.create({
    data: {
      leadId: data.leadId,
      userId: finalUserId,
      duration: data.duration,
      status: data.status,
      stage: data.stage,
      transcript: data.transcript,
      analysis: data.analysis,
    },
  });

  // Map call stages to lead statuses
  let leadStatus = "CONTACTED";
  if (data.stage === "New Lead") leadStatus = "NEW";
  if (["Interested", "Qualified", "Follow-up Needed", "Desire", "Enquiry"].includes(data.stage)) leadStatus = "QUALIFIED";
  if (data.stage === "Closed") leadStatus = "CLOSED_WON";

  // Update the Lead status as well
  await prisma.lead.update({
    where: { id: data.leadId },
    data: { status: leadStatus }
  });

  revalidatePath("/admin/calls");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${data.leadId}`);
  
  return call;
}

export async function getActiveSipConfig() {
  try {
    const config = await prisma.sipTrunkConfig.findFirst({
      where: { isActive: true }
    });
    if (config) {
      return {
        domain: config.domain,
        username: config.username,
        callerId: config.callerId,
        codec: config.codec,
        isActive: true
      };
    }
  } catch (error) {
    console.error("Failed to load active SIP config:", error);
  }
  return null;
}

export async function placeRealTwilioCall(leadId: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { error: "Twilio credentials are not configured in your .env file." };
  }

  try {
    // 1. Fetch Lead phone number
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return { error: "Lead not found in database." };
    }

    // 2. Fetch Active SIP Trunk Config
    const sipConfig = await prisma.sipTrunkConfig.findFirst({
      where: { isActive: true }
    });

    if (!sipConfig || !sipConfig.callerId) {
      return { error: "No active SIP Trunk configuration found. Please check your settings." };
    }

    const client = twilio(accountSid, authToken);

    // Format phone number to E.164 (ensure it has the country code)
    let formattedPhone = lead.phone.replace(/[^\d+]/g, ""); // Keep only digits and +
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.startsWith("91") && formattedPhone.length === 12) {
        formattedPhone = "+" + formattedPhone;
      } else {
        formattedPhone = "+91" + formattedPhone; // Default to India (+91)
      }
    }

    // Call out from your purchased US number to the lead's formatted phone number
    const call = await client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml",
      to: formattedPhone,
      from: sipConfig.callerId
    });

    return { success: true, callSid: call.sid };
  } catch (error: any) {
    console.error("Twilio Outbound Call Error:", error);
    return { error: error.message || "Failed to trigger outbound call via Twilio." };
  }
}
