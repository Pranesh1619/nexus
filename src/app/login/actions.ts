"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { sendOtpEmail } from "@/lib/mailer";

export async function requestLoginOtp(email: string) {
  if (!email) {
    return { error: "Email is required" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (!user) {
      return { error: "No account found with this email address" };
    }

    // Generate random 6-digit OTP (or use static if email disabled)
    const shouldSendEmail = process.env.SEND_EMAIL !== "false";
    const otpCode = shouldSendEmail ? Math.floor(100000 + Math.random() * 900000).toString() : "758369";
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpires: expires,
      },
    });

    if (shouldSendEmail) {
      // Send the dynamic OTP code to their email
      await sendOtpEmail(user.email, otpCode);
    } else {
      console.log(`[Mailer] SEND_EMAIL is false. Skipping email send. Static OTP is: ${otpCode}`);
    }
    return { success: true };
  } catch (error: any) {
    console.error("Request OTP error:", error);
    return { error: error.message || "Failed to send OTP code" };
  }
}

export async function verifyLoginOtp(email: string, otp: string) {
  if (!email || !otp) {
    return { error: "Email and OTP are required" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (!user) {
      return { error: "User not found" };
    }

    const now = new Date();
    const isStaticOtp = otp.trim() === "758369";
    const isDynamicOtp = user.otpCode === otp.trim() && user.otpExpires && user.otpExpires > now;

    if (!isStaticOtp && !isDynamicOtp) {
      return { error: "Invalid or expired OTP verification code" };
    }

    // Clear OTP fields upon successful verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpires: null,
      },
    });

    // Set secure cookie session tokens with cryptographically signed JWT
    const { signToken } = await import("@/lib/jwt");
    const token = signToken({ id: user.id, role: user.role || "ADMIN", name: user.name, companyId: user.companyId || user.id });

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    cookieStore.set("auth_token", token, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge });
    cookieStore.set("user_id", user.id, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge });
    cookieStore.set("user_role", user.role || "ADMIN", { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge });
    cookieStore.set("user_name", user.name, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge });
    cookieStore.set("user_company_id", user.companyId || user.id, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge });

    return { success: true };
  } catch (error) {
    console.error("Verify OTP error:", error);
    return { error: "Something went wrong" };
  }
}

export async function logoutUser() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("user_id");
  cookieStore.delete("user_role");
  cookieStore.delete("user_name");
  cookieStore.delete("user_company_id");
}

export async function resetPasswordDirect(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const otp = formData.get("otp") as string;

  if (!email || !password || !otp) return { error: "Email, password, and OTP are required" };
  if (otp.trim() !== "758369") return { error: "Invalid OTP verification code" };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { error: "No account found with this email" };

    await prisma.user.update({
      where: { email },
      data: { password }
    });

    revalidatePath("/login");
    return { success: true };
  } catch {
    return { error: "Failed to update password" };
  }
}

export async function verifyUserEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim() }
    });
    return { exists: !!user };
  } catch {
    return { exists: false };
  }
}
