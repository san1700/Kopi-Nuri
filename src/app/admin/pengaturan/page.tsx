import { getSettingsAndCashiers } from "@/app/actions/pengaturan";
import { PengaturanClient } from "@/components/admin/pengaturan-client";

export const dynamic = "force-dynamic";

export default async function AdminPengaturanPage() {
  const { settings, users } = await getSettingsAndCashiers();
  return <PengaturanClient initialSettings={settings} initialUsers={users} />;
}
