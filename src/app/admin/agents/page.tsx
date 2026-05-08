import React from "react";
import { prisma } from "@/lib/db";
import AgentsWorkspace from "./AgentsWorkspace";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  // Fetch active sales/admin agents along with their leads and calls
  const agents = await prisma.user.findMany({
    where: {
      status: { in: ["ACTIVE", "Active", "active"] },
    },
    include: {
      leads: {
        include: {
          calls: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      calls: {
        include: {
          lead: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Agent Analytics Dashboard</h2>
          <p className="text-secondary small">Analyze assigned lead lifecycle metrics, AI call performance transcripts, and pipeline velocity.</p>
        </div>
      </div>

      <AgentsWorkspace initialAgents={agents} />
    </div>
  );
}
