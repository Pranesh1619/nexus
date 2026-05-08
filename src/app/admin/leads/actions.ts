"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { syncWithZoho, updateZohoLeadStatus } from "@/lib/zoho";

export async function getLeads(userId?: string) {
  if (userId) {
    return await prisma.lead.findMany({
      where: { assignedTo: userId },
      include: {
        calls: {
          orderBy: { createdAt: "desc" },
        },
        salesPerson: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return await prisma.lead.findMany({
    include: {
      calls: {
        orderBy: { createdAt: "desc" },
      },
      salesPerson: true,
    },
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
  const lead = await prisma.lead.update({
    where: { id },
    data: { status },
  });

  if (lead && lead.phone) {
    try {
      await updateZohoLeadStatus(lead.phone, status);
    } catch (e) {
      console.error("[ZOHO SYNC] Error syncing lead status:", e);
    }
  }

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

  const lead = await prisma.lead.update({
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

  if (lead && lead.phone) {
    try {
      await updateZohoLeadStatus(lead.phone, status);
    } catch (e) {
      console.error("[ZOHO SYNC] Error syncing lead status during full update:", e);
    }
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

export async function triggerZohoSync() {
  const result = await syncWithZoho();
  revalidatePath("/admin/leads");
  revalidatePath("/admin/agents");
  return result;
}
