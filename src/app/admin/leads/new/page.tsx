"use client";
 
import React, { useTransition, useState, useEffect, Suspense } from "react";
import { createLead } from "../actions";
import { getUsers } from "../../sales/actions";
import { getCurrentAgent } from "../../calls/new/actions";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function NewLeadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAgentId = searchParams.get("assignedTo") || "";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  useEffect(() => {
    async function loadAgentAndAgents() {
      try {
        const agent = await getCurrentAgent();
        if (agent) {
          setCurrentUserRole(agent.role || "");
        }
        const users = await getUsers("SALES");
        setAgents(users);
      } catch (err) {
        console.error("Failed to load agent/agents:", err);
      }
    }
    loadAgentAndAgents();
  }, []);

  useEffect(() => {
    if (preselectedAgentId) {
      setSelectedAgent(preselectedAgentId);
    }
  }, [preselectedAgentId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      try {
        const res = await createLead(formData);
        if (res && !res.success) {
          setError(res.error || "Failed to create lead.");
        } else {
          // If pre-selected an agent, route back to agent profile or leads list
          if (preselectedAgentId) {
            router.push(`/admin/agents/${preselectedAgentId}`);
          } else {
            router.push("/admin/leads");
          }
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to create lead:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <Link 
          href={preselectedAgentId ? `/admin/agents/${preselectedAgentId}` : "/admin/leads"} 
          className="btn btn-link text-secondary text-decoration-none p-0 mb-1"
        >
          <i className="bi bi-arrow-left me-1 x-small"></i>{" "}
          <span className="x-small fw-bold uppercase">
            Back to {preselectedAgentId ? "Agent Profile" : "Leads"}
          </span>
        </Link>
        <h3 className="fw-bold mb-1">Add New Lead</h3>
        <p className="text-secondary x-small">Enter the details of the potential customer.</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 animate-fade" style={{ borderRadius: "12px", backgroundColor: "rgba(220, 53, 69, 0.08)", color: "#842029" }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
            <span className="small fw-semibold">{error}</span>
          </div>
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Full Name</label>
                <input name="name" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2 animate-pulse" placeholder="e.g. John Doe" required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Phone Number</label>
                <input name="phone" type="tel" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="+1 234 567 890" required />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Email Address</label>
                <input name="email" type="email" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="john@example.com" />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Company Name</label>
                <input name="company" type="text" className="form-control form-control-sm bg-light border-0 small px-3 py-2" placeholder="Virpa Solutions" />
              </div>
              <div className="col-md-6">
                <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Source</label>
                <select name="source" className="form-select form-select-sm bg-light border-0 small px-3 py-2">
                  <option value="WEBSITE">Website</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="COLD_CALL">Cold Call</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                </select>
              </div>
              {currentUserRole !== "SALES" && (
                <div className="col-md-6">
                  <label className="form-label x-small fw-bold text-secondary text-uppercase mb-1">Assign to Agent</label>
                  <select 
                    name="assignedTo" 
                    value={selectedAgent} 
                    onChange={(e) => setSelectedAgent(e.target.value)} 
                    className="form-select form-select-sm bg-light border-0 small px-3 py-2"
                  >
                    <option value="">Unassigned (Return to general pool)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="d-grid d-md-flex justify-content-md-end mt-4 pt-3 border-top">
              <button type="submit" disabled={isPending} className="btn btn-primary px-5 py-2 small fw-bold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: "#00a76f", borderColor: "#00a76f" }}>
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Creating...</span>
                  </>
                ) : (
                  "Create New Lead"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Saving Overlay Modal */}
      {isPending && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade"
          style={{ 
            zIndex: 1060, 
            backgroundColor: "rgba(15, 23, 42, 0.45)", 
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease"
          }}
        >
          <div 
            className="card border-0 shadow-lg p-4 w-100 mx-3 text-center bg-white animate-scale" 
            style={{ maxWidth: "400px", borderRadius: "20px" }}
          >
            <div className="py-4">
              <div className="spinner-border text-success mb-3" role="status" style={{ width: "3.5rem", height: "3.5rem" }}>
                <span className="visually-hidden">Creating...</span>
              </div>
              <h4 className="fw-bold text-dark mb-1">Creating Lead...</h4>
              <p className="text-secondary small mt-1 mb-0">Please wait while lead is being provisioned in the queue.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewLeadPage() {
  return (
    <Suspense fallback={
      <div className="page-container text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading form...</span>
        </div>
      </div>
    }>
      <NewLeadForm />
    </Suspense>
  );
}
