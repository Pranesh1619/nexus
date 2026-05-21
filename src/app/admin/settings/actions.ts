"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateUserInfo(formData: FormData) {
  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const status = formData.get("status") as string;

  if (!userId) return { error: "User ID is required" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
        status,
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

export async function updatePassword(formData: FormData) {
  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!userId || !newPassword) return { error: "Data missing" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { password: newPassword }, // Hash this in real apps!
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update password" };
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
        isActive: false
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

    revalidatePath("/admin/settings");
    revalidatePath("/admin/calls/new");
    return { success: true, config };
  } catch (error) {
    console.error("Failed to save SIP config:", error);
    return { error: "Failed to save SIP Trunk settings" };
  }
}

