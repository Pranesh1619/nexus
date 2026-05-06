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

    // Set secure cookie session tokens with cryptographically signed JWT
    const { signToken } = await import("@/lib/jwt");
    const token = signToken({ id: user.id, role: user.role || "ADMIN", name: user.name });

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    cookieStore.set("user_id", user.id, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    cookieStore.set("user_role", user.role || "ADMIN", { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    cookieStore.set("user_name", user.name, { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Something went wrong" };
  }

  redirect("/admin");
}

export async function logoutUser() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("user_id");
  cookieStore.delete("user_role");
  cookieStore.delete("user_name");
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
