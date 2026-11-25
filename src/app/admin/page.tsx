import { getAdminDashboardData } from "@/app/actions/dashboard";
import { DashboardClient } from "@/components/admin/dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const data = await getAdminDashboardData();
  return <DashboardClient data={data} />;
}
