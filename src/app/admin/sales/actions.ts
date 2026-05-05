"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createSalesPerson(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  await prisma.user.create({
    data: {
      name,
      email,
      password, // In a real app, hash this!
      role: "SALES",
    },
  });

  revalidatePath("/admin/sales");
}

export async function deleteUser(id: string) {
  await prisma.user.delete({
    where: { id },
  });

  revalidatePath("/admin/sales");
}

export async function getUsers(role: string = "SALES") {
  return await prisma.user.findMany({
    where: { role },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
  });
}

export async function updateUser(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const status = formData.get("status") as string;

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      status,
    },
  });

  revalidatePath("/admin/sales");
}
