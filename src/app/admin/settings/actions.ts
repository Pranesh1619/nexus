"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateUserInfo(formData: FormData) {
  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const status = formData.get("status") as string;
  const phone = formData.get("phone") as string;

  if (!userId) return { error: "User ID is required" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
        status,
        phone: phone || null,
      },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Update error:", error);
    return { error: "Failed to update user info" };
  }
}

export async function updateUserEmail(formData: FormData) {
  const userId = formData.get("userId") as string;
  const newEmail = formData.get("newEmail") as string;

  if (!userId || !newEmail) return { error: "Data missing" };

  try {
    const existing = await prisma.user.findFirst({
      where: {
        email: newEmail.trim(),
        NOT: { id: userId }
      }
    });

    if (existing) {
      return { error: "This email address is already in use" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail.trim() },
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update email address" };
  }
}

export async function deleteUserAccount(userId: string) {
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    // In a real app, clear session here
    return { success: true };
  } catch {
    return { error: "Failed to delete account" };
  }
}

export async function getSipTrunkConfig() {
  try {
    const config = await prisma.sipTrunkConfig.findUnique({
      where: { id: "default_sip_config" }
    });
    if (!config) {
      return {
        id: "default_sip_config",
        domain: "",
        webSocketUrl: "",
        username: "",
        password: "",
        callerId: "",
        codec: "OPUS",
        isActive: false,
        mockTwilioUrl: ""
      };
    }
    return config;
  } catch (error) {
    console.error("Failed to fetch SIP config:", error);
    return null;
  }
}

export async function saveSipTrunkConfig(data: {
  domain: string;
  webSocketUrl: string;
  username: string;
  password?: string;
  callerId: string;
  codec: string;
  isActive: boolean;
  mockTwilioUrl?: string | null;
}) {
  try {
    const existing = await prisma.sipTrunkConfig.findUnique({
      where: { id: "default_sip_config" }
    });

    const payload: any = {
      domain: data.domain,
      webSocketUrl: data.webSocketUrl,
      username: data.username,
      callerId: data.callerId,
      codec: data.codec,
      isActive: data.isActive,
      mockTwilioUrl: data.mockTwilioUrl || ""
    };

    if (data.password !== undefined && data.password !== "") {
      payload.password = data.password;
    } else if (!existing) {
      payload.password = "";
    }

    const config = await prisma.sipTrunkConfig.upsert({
      where: { id: "default_sip_config" },
      create: {
        id: "default_sip_config",
        ...payload,
        password: payload.password || ""
      },
      update: payload
    });

    // Auto-propagate SIP settings to the self-hosted mock Twilio gateway if configured
    if (config.mockTwilioUrl) {
      try {
        const nextJsUrl = process.env.APP_URL || "http://localhost:3000";
        const bodyParams = new URLSearchParams();
        bodyParams.append("sipDomain", config.domain);
        bodyParams.append("sipUser", config.username);
        bodyParams.append("sipPass", payload.password || existing?.password || "");
        bodyParams.append("appUrl", nextJsUrl);
        // Default to Asterisk mode if enabled, otherwise Simulator. 
        // Note: The user can still update Telnyx specific variables manually or in the wrapper dashboard.
        bodyParams.append("telephonyMode", config.isActive ? "asterisk" : "simulator");

        fetch(`${config.mockTwilioUrl.replace(/\/$/, "")}/api/settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: bodyParams.toString()
        }).then((res) => {
          if (res.ok) {
            console.log(`[SIP SYNC] Successfully synced settings to mock Twilio gateway at ${config.mockTwilioUrl}`);
          }
        }).catch(err => {
          console.warn("[SIP SYNC] Background sync to mock Twilio gateway failed:", err.message);
        });
      } catch (urlErr: any) {
        console.warn("[SIP SYNC] Invalid mockTwilioUrl format. Sync skipped:", urlErr.message);
      }
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin/calls/new");
    return { success: true, config };
  } catch (error) {
    console.error("Failed to save SIP config:", error);
    return { error: "Failed to save SIP Trunk settings" };
  }
}

