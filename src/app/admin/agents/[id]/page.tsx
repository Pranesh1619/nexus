import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import AgentDetailsWorkspace from "./AgentDetailsWorkspace";

export const dynamic = "force-dynamic";

interface AgentDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AgentDetailsPage({ params }: AgentDetailsPageProps) {
  const resolvedParams = await params;
  
  // Fetch active agent along with their leads and calls
  const agent = await prisma.user.findUnique({
    where: {
      id: resolvedParams.id,
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
  });

  if (!agent) {
    notFound();
  }

  return (
    <div className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/admin/agents" className="btn btn-link text-secondary text-decoration-none p-0 mb-1">
            <i className="bi bi-arrow-left me-1 x-small"></i> <span className="x-small fw-bold uppercase">Back to Agents</span>
          </Link>
          <h3 className="fw-bold mb-1 text-dark">{agent.name} Profile</h3>
        </div>
        <div className="d-flex gap-2">
          <Link href={`/admin/leads/new?assignedTo=${agent.id}`} className="btn btn-primary px-3 py-1.5 small fw-bold text-white d-flex align-items-center gap-2" style={{ backgroundColor: "#00a76f", borderColor: "#00a76f" }}>
            <i className="bi bi-person-plus-fill"></i>Create Lead for Agent
          </Link>
          <Link href={`/admin/users/${agent.id}/edit`} className="btn btn-light border px-3 py-1.5 small fw-bold">
            <i className="bi bi-pencil-square me-2 text-info"></i>Edit Agent Settings
          </Link>
        </div>
      </div>

      <AgentDetailsWorkspace agent={agent} />
    </div>
  );
}
