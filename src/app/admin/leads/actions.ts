"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { syncWithZoho, updateZohoBiginStatus, updateZohoBiginContact } from "@/lib/zoho";

export async function getLeads(userId?: string) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;
  const userCompanyId = cookieStore.get("user_company_id")?.value;

  const whereClause: any = {};

  if (userId) {
    whereClause.assignedTo = userId;
  } else if (userRole !== "SUPER_ADMIN" && userCompanyId) {
    whereClause.salesPerson = {
      companyId: userCompanyId
    };
  }

  return await prisma.lead.findMany({
    where: whereClause,
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

  const cookieStore = await cookies();
  const creatorId = cookieStore.get("user_id")?.value;

  await prisma.lead.create({
    data: {
      name,
      phone,
      email,
      company,
      source,
      status: "NEW",
      assignedTo: creatorId,
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
      await updateZohoBiginStatus(lead.phone, status, lead.assignedTo || undefined);
    } catch (e) {
      console.error("[ZOHO SYNC] Error syncing lead status during admin status update:", e);
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
      await updateZohoBiginContact(lead.phone, {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        company: lead.company,
        status: lead.status
      }, lead.assignedTo || undefined);
    } catch (e) {
      console.error("[ZOHO SYNC] Error updating Zoho Bigin contact during admin update:", e);
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

export async function checkCrmConnectionStatus() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (userId) {
      const dbConfig = await prisma.zohoConfig.findUnique({
        where: { id: userId }
      });
      if (dbConfig && dbConfig.clientId && dbConfig.clientSecret && dbConfig.refreshToken) {
        return { connected: true, type: "DATABASE" };
      }
    }

    const dbConfig = await prisma.zohoConfig.findUnique({
      where: { id: "default_zoho_config" }
    });
    if (dbConfig && dbConfig.clientId && dbConfig.clientSecret && dbConfig.refreshToken) {
      return { connected: true, type: "DATABASE" };
    }
  } catch (err) {
    console.warn("[ZOHO SYNC] Database unreachable during CRM connection status check. Falling back to env...", err);
  }

  try {
    const { isZohoConfigured } = await import("@/lib/zoho");
    if (isZohoConfigured()) {
      return { connected: true, type: "ENV" };
    }
  } catch (err) {
    console.warn("[ZOHO SYNC] Error checking environment variable fallback:", err);
  }

  return { connected: false };
}
