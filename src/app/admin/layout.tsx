import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/jwt";
import DashboardLayout from "@/components/DashboardLayout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = verifyToken(token) as any;
  if (!payload) {
    // Clear invalid cookies
    cookieStore.delete("auth_token");
    cookieStore.delete("user_id");
    cookieStore.delete("user_role");
    cookieStore.delete("user_name");
    redirect("/login");
  }

  const userRole = payload.role || "ADMIN";
  const userName = payload.name || "Administrator";

  return (
    <DashboardLayout userRole={userRole} userName={userName}>
      {children}
    </DashboardLayout>
  );
}
