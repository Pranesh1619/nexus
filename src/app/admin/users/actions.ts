"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAllUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  await prisma.user.create({
    data: {
      name,
      email,
      password,
      role,
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
  await prisma.user.delete({
    where: { id },
  });

  revalidatePath("/admin/users");
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
  });
}

export async function updateUser(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const status = formData.get("status") as string;

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role,
      status,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}
