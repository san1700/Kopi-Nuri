import { getLaporanData } from "@/app/actions/laporan";
import { LaporanClient } from "@/components/admin/laporan-client";

export const dynamic = "force-dynamic";

export default async function AdminLaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; shift?: string }>;
}) {
  const sp = await searchParams;
  const data = await getLaporanData({
    from: sp.from,
    to: sp.to,
    shift: sp.shift,
  });

  return <LaporanClient data={data} />;
}

