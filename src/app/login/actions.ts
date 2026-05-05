"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.password !== password) {
      return { error: "Invalid email or password" };
    }

    // In a real app, you would set a session cookie here
    // For now, we'll just redirect to admin
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Something went wrong" };
  }

  redirect("/admin");
}

export async function resetPasswordDirect(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password are required" };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { error: "No account found with this email" };

    await prisma.user.update({
      where: { email },
      data: { password }
    });

    revalidatePath("/login");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update password" };
  }
}
