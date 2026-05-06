import { cookies } from "next/headers";
import DashboardLayout from "@/components/DashboardLayout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value || "ADMIN";
  const userName = cookieStore.get("user_name")?.value || "Administrator";

  return (
    <DashboardLayout userRole={userRole} userName={userName}>
      {children}
    </DashboardLayout>
  );
}
