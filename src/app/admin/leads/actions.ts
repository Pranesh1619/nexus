"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getLeads() {
  return await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createLead(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;
  const source = formData.get("source") as string;

  await prisma.lead.create({
    data: {
      name,
      phone,
      email,
      company,
      source,
      status: "NEW",
    },
  });

  revalidatePath("/admin/leads");
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({
    where: { id },
  });

  revalidatePath("/admin/leads");
}

export async function updateLeadStatus(id: string, status: string) {
  await prisma.lead.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/admin/leads");
}

export async function getLeadById(id: string) {
  return await prisma.lead.findUnique({
    where: { id },
    include: {
      calls: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateLead(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;
  const source = formData.get("source") as string;
  const status = formData.get("status") as string;

  await prisma.lead.update({
    where: { id },
    data: {
      name,
      phone,
      email,
      company,
      source,
      status,
    },
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}
