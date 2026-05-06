import React from "react";
import { prisma } from "@/lib/db";
import DealsPipelineClient from "./DealsPipelineClient";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  // Fetch real leads from the database to populate our Kanban board pipeline
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
  });

  // Serialize leads to transfer across Server-Client boundary safely
  const serializedLeads = leads.map(lead => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  }));

  return (
    <DealsPipelineClient initialLeads={serializedLeads} />
  );
}
