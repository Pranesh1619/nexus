import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import SettingsClient from "./SettingsClient";
import ProfileClient from "./ProfileClient";
import SipTrunkSettingsClient from "./SipTrunkSettingsClient";
import { getSipTrunkConfig } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId }
    });
  }

  if (!user) {
    user = await prisma.user.findFirst();
  }

  const sipConfig = await getSipTrunkConfig();

  if (!user) {
    return (
      <div className="alert alert-warning">No user found in database.</div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Account & Settings</h3>
        <p className="text-secondary x-small">Manage your administrative profile, security settings, and VoIP telephony configurations.</p>
      </div>

      <div className="row g-4 mb-4">
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

      <div className="row">
        <div className="col-12">
          {sipConfig && <SipTrunkSettingsClient initialConfig={sipConfig} />}
        </div>
      </div>
    </div>
  );
}

