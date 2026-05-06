import React from "react";
import { prisma } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Fetch real calls, leads, and users from the database
  const calls = await prisma.callLog.findMany({
    include: {
      lead: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const users = await prisma.user.findMany({
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
