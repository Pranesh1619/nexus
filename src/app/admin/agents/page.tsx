import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import AgentsWorkspace from "./AgentsWorkspace";

import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;
  const userCompanyId = cookieStore.get("user_company_id")?.value;

  const whereClause: any = {
    status: { in: ["ACTIVE", "Active", "active"] },
  };

  if (userRole !== "SUPER_ADMIN" && userCompanyId) {
    whereClause.companyId = userCompanyId;
  }
  whereClause.role = "SALES";

  // Fetch active sales/admin agents along with their leads and calls
  const agents = await prisma.user.findMany({
    where: whereClause,
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
          <p className="text-secondary small mb-0">Analyze assigned lead lifecycle metrics, AI call performance transcripts, and pipeline velocity.</p>
        </div>
      </div>

      <AgentsWorkspace initialAgents={agents} />
    </div>
  );
}
