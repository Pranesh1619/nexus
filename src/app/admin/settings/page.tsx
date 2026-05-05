import { prisma } from "@/lib/db";
import { updateUserInfo } from "./actions";
import SettingsClient from "./SettingsClient";
import ProfileClient from "./ProfileClient";

export default async function SettingsPage() {
  // Mocking "current user" for demo purposes
  const user = await prisma.user.findFirst();

  if (!user) {
    return (
      <div className="alert alert-warning">No user found in database.</div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Account & Security</h3>
        <p className="text-secondary x-small">Manage your administrative profile and authentication protocols.</p>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-4 d-flex align-items-center gap-2 small uppercase text-secondary">
                <i className="bi bi-person-badge text-primary"></i>
                Profile Information
              </h6>
              
              <ProfileClient user={user} />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <SettingsClient userId={user.id} />
        </div>
      </div>
    </div>
  );
}
