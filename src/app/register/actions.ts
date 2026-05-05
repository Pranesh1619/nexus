"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists" };
    }

    await prisma.user.create({
      data: {
        name,
        email,
        password, // In a real app, hash this!
        role: "SALES", // Default role
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Something went wrong" };
  }

  redirect("/login");
}
