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
      password, // Plain text as per local dev requirement (In production, hash this!)
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
  let users = await prisma.user.findMany({
    where: { role },
    orderBy: { createdAt: "desc" },
  });

  // Auto-provision 2 sales agent personas if fewer than 2 exist
  if (users.length < 2) {
    await prisma.user.upsert({
      where: { email: "john@virpa.com" },
      update: {},
      create: {
        name: "John Sales Agent",
        email: "john@virpa.com",
        password: "password123",
        role: "SALES",
      }
    });

    await prisma.user.upsert({
      where: { email: "jane@virpa.com" },
      update: {},
      create: {
        name: "Jane Sales Agent",
        email: "jane@virpa.com",
        password: "password123",
        role: "SALES",
      }
    });

    // Re-fetch to return all current agents including auto-created ones
    users = await prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: "desc" },
    });
  }

  return users;
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

export async function getLeadsForSalesFloor() {
  return await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function assignLeadToUser(leadId: string, userId: string | null) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedTo: userId }
  });

  revalidatePath("/admin/sales");
  revalidatePath("/admin/leads");
}
