"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string || "";
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string || "";

  if (!firstName || !email) {
    return { error: "First Name and Email are required" };
  }

  const name = `${firstName} ${lastName}`.trim();
  // Generate random password since login is passwordless
  const password = Math.random().toString(36).slice(-10);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (existingUser) {
      return { error: "User already exists" };
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.trim(),
        password,
        phone: phone.trim(),
        role: "COMPANY_ADMIN",
      },
    });

    // Set companyId to the user's ID for tenant isolation
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: user.id },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Something went wrong" };
  }

  redirect("/login");
}
