import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWhatsappDashboardData } from "@/app/actions/whatsapp";
import { WhatsappClient } from "@/components/admin/whatsapp-client";

export const dynamic = "force-dynamic";

export default async function AdminWhatsappPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const sp = await searchParams;
  const status = sp.status || "ALL";
  const page = Number(sp.page || "1") || 1;

  const data = await getWhatsappDashboardData({
    status: status === "ALL" ? undefined : status,
    page,
  });

  return <WhatsappClient data={data} currentStatus={status} />;
}

