import { cookies } from "next/headers";
import React from "react";
import { prisma } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const userRole = cookieStore.get("user_role")?.value;
  const isSales = userRole === "SALES";

  // Fetch real calls, leads, and users from the database
  const calls = await prisma.callLog.findMany({
    where: isSales ? { userId } : {},
    include: {
      lead: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const leads = await prisma.lead.findMany({
    where: isSales ? { assignedTo: userId } : {},
    orderBy: { createdAt: "desc" },
  });

  const users = await prisma.user.findMany({
    where: isSales ? { id: userId } : {},
    orderBy: { createdAt: "desc" },
  });

  // Serialize date fields to ISO strings so Next.js can safely pass them across Server-Client boundaries
  const serializedCalls = calls.map(call => ({
    ...call,
    startTime: call.startTime.toISOString(),
    endTime: call.endTime ? call.endTime.toISOString() : null,
    createdAt: call.createdAt.toISOString(),
    lead: {
      ...call.lead,
      createdAt: call.lead.createdAt.toISOString(),
      updatedAt: call.lead.updatedAt.toISOString(),
    },
    user: {
      ...call.user,
      createdAt: call.user.createdAt.toISOString(),
      updatedAt: call.user.updatedAt.toISOString(),
    },
  }));

  const serializedLeads = leads.map(lead => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  }));

  const serializedUsers = users.map(user => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));

  return (
    <DashboardClient 
      initialCalls={serializedCalls as any} 
      initialLeads={serializedLeads as any} 
      initialUsers={serializedUsers as any} 
    />
  );
}
