"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  } catch (error) {
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
  } catch (error) {
    return { error: "Failed to delete account" };
  }
}
