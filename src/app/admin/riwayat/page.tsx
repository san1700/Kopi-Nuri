import { LedgerHistoryView } from "@/components/ledger-history-view";

export default function AdminRiwayatPage() {
  return (
    <LedgerHistoryView
      title="Riwayat Poin & Mutasi Ledger"
      subtitle="Monitoring semua mutasi poin member: perolehan belanja, bonus pendaftaran, penukaran, dan koreksi admin."
      allowAdjust={true}
    />
  );
}
