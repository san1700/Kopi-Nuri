"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendTestWhatsapp } from "@/app/actions/whatsapp";
import { formatPhoneDisplay } from "@/lib/phone";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  DataTable,
  StatusPill,
  EmptyState,
  FormField,
  FilterChips,
} from "@/components/ui/kopi-ui";

interface WaLogItem {
  id: string;
  templateName: string;
  status: "QUEUED" | "SENT" | "FAILED" | "SKIPPED";
  waMessageId: string | null;
  error: string | null;
  createdAt: string | Date;
  member: {
    code: string;
    name: string;
    phone: string;
    waOptIn: boolean;
  };
}

interface DashboardProps {
  data: {
    config: {
      dryRun: boolean;
      templateName: string;
      apiVersion: string;
      hasCredentials: boolean;
      inactiveDays: number;
      cooldownDays: number;
      templatePreview: string;
    };
    stats: {
      sentCount: number;
      skippedCount: number;
      failedCount: number;
      queuedCount: number;
      optInCount: number;
    };
    logs: WaLogItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  };
  currentStatus: string;
}

function StatusBadge({ status }: { status: WaLogItem["status"] }) {
  if (status === "SENT") return <StatusPill variant="success">Sent</StatusPill>;
  if (status === "SKIPPED") return <StatusPill variant="warn">Skipped</StatusPill>;
  if (status === "FAILED") return <StatusPill variant="danger">Failed</StatusPill>;
  return <StatusPill variant="neutral">Queued</StatusPill>;
}

export function WhatsappClient({ data, currentStatus }: DashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState("");
  const [testName, setTestName] = useState("Sahabat Nuri");
  const [testPoints, setTestPoints] = useState("120");
  const [lastPreview, setLastPreview] = useState<{
    to: string;
    status: string;
    previewMessage: string;
    loggedToMember: boolean;
  } | null>(null);

  function handleStatusFilter(status: string) {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    router.push(`/admin/whatsapp${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (currentStatus !== "ALL") params.set("status", currentStatus);
    params.set("page", String(newPage));
    router.push(`/admin/whatsapp?${params.toString()}`);
  }

  function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Nomor HP tujuan wajib diisi");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("phone", phone.trim());
      fd.set("name", testName.trim() || "Sahabat Nuri");
      fd.set("points", testPoints.trim() || "120");

      const res = await sendTestWhatsapp(fd);
      if (!res.success) {
        toast.error(res.error || "Gagal mengirim uji WhatsApp");
        return;
      }

      setLastPreview({
        to: res.to!,
        status: res.status!,
        previewMessage: res.previewMessage!,
        loggedToMember: Boolean(res.loggedToMember),
      });

      if (res.dryRun) {
        toast.success(`Simulasi DRY RUN berhasil (${res.to})`);
      } else {
        toast.success(`Pesan uji terkirim ke ${res.to}`);
      }
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp comeback"
        subtitle="Pantau log pesan ajakan kembali dan uji kirim template Meta Cloud API."
        actions={
          data.config.dryRun ? (
            <span className="inline-flex items-center gap-2 font-semibold text-[13px] px-3.5 py-2 rounded-[12px] bg-[var(--warnbg)] text-[var(--warn)]">
              <AlertTriangle size={16} />
              Mode dry run aktif (WA_DRY_RUN=true)
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-semibold text-[13px] px-3.5 py-2 rounded-[12px] bg-[var(--mint)] text-[var(--brand)]">
              <CheckCircle2 size={16} />
              Mode live ({data.config.apiVersion})
            </span>
          )
        }
      />

      {/* 4 StatCard */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Member opt-in WA" value={data.stats.optInCount} />
        <StatCard
          label="Terkirim (sent)"
          value={data.stats.sentCount}
          valueClassName="text-[var(--brand)]"
        />
        <StatCard
          label="Dry run (skipped)"
          value={data.stats.skippedCount}
          valueClassName="text-[var(--warn)]"
        />
        <StatCard
          label="Gagal (failed)"
          value={data.stats.failedCount}
          valueClassName="text-[var(--bad)]"
        />
      </section>

      {/* Template Info + Send Test Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Template & Rules */}
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <h2 className="text-[16px] font-bold text-[var(--ink)] mb-3.5">
            Template &amp; aturan pengiriman
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-[var(--bg)] rounded-[14px] px-3.5 py-3">
              <small className="block text-[var(--mut)] text-[12px]">Nama template</small>
              <b className="font-mono text-[var(--ink)]">{data.config.templateName}</b>
            </div>
            <div className="bg-[var(--bg)] rounded-[14px] px-3.5 py-3">
              <small className="block text-[var(--mut)] text-[12px]">
                Graph API &amp; kredensial
              </small>
              <b className="text-[var(--ink)]">
                {data.config.apiVersion} ·{" "}
                {data.config.hasCredentials ? "terisi" : "belum diisi"}
              </b>
            </div>
            <div className="bg-[var(--bg)] rounded-[14px] px-3.5 py-3">
              <small className="block text-[var(--mut)] text-[12px]">
                Batas tidak berkunjung
              </small>
              <b className="text-[var(--ink)]">&gt; {data.config.inactiveDays} hari</b>
            </div>
            <div className="bg-[var(--bg)] rounded-[14px] px-3.5 py-3">
              <small className="block text-[var(--mut)] text-[12px]">
                Cooldown &amp; jam kirim
              </small>
              <b className="text-[var(--ink)]">
                {data.config.cooldownDays} hari · 09.00–20.00 WIB
              </b>
            </div>
          </div>

          <div className="bg-[var(--mint)] rounded-[16px] p-4 mt-3">
            <b className="text-[var(--brand)] block text-[13.5px]">Pratinjau isi template</b>
            <p className="text-[13px] text-[var(--ink)] mt-1.5 leading-relaxed">
              {data.config.templatePreview}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <StatusPill variant="success">{"{{1}}"} = nama member</StatusPill>
              <StatusPill variant="success">{"{{2}}"} = saldo poin</StatusPill>
            </div>
          </div>
        </div>

        {/* Form Kirim Uji */}
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <h2 className="text-[16px] font-bold text-[var(--ink)] mb-3.5">
            Kirim uji ke satu nomor
          </h2>

          <form onSubmit={handleSendTest} className="space-y-3.5">
            <FormField label="Nomor HP tujuan">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Param {{1}} (nama)">
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
                />
              </FormField>
              <FormField label="Param {{2}} (poin)">
                <input
                  type="number"
                  min={0}
                  value={testPoints}
                  onChange={(e) => setTestPoints(e.target.value)}
                  className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
                />
              </FormField>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 bg-[var(--btn)] text-white rounded-[12px] py-3 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
            >
              {isPending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              {data.config.dryRun
                ? "Simulasikan kirim uji (dry run)"
                : "Kirim uji sekarang"}
            </button>
          </form>

          {lastPreview && (
            <div className="mt-3.5 bg-[var(--bg)] border border-[var(--line)] rounded-[14px] p-3.5 text-[12.5px] space-y-1">
              <b className="text-[var(--ink)]">
                Hasil uji: {lastPreview.status} → {lastPreview.to}
                {lastPreview.loggedToMember ? " (Tercatat di WaMessageLog)" : ""}
              </b>
              <p className="text-[var(--mut)]">{lastPreview.previewMessage}</p>
            </div>
          )}
        </div>
      </section>

      {/* Log Pengiriman */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] mt-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
          <h2 className="text-[16px] font-bold text-[var(--ink)]">
            Log pengiriman ({data.pagination.totalCount})
          </h2>

          <FilterChips
            value={currentStatus}
            onChange={handleStatusFilter}
            options={[
              { label: "Semua", value: "ALL" },
              { label: "Sent", value: "SENT" },
              { label: "Skipped", value: "SKIPPED" },
              { label: "Failed", value: "FAILED" },
              { label: "Queued", value: "QUEUED" },
            ]}
          />
        </div>

        <DataTable
          columns={["Waktu", "Member", "Nomor HP", "Template", "Status", "Catatan"]}
          isEmpty={data.logs.length === 0}
          empty={
            <EmptyState
              icon={<MessageCircle size={24} />}
              title="Belum ada log pengiriman WhatsApp"
              description="Jalankan cron atau kirim uji ke satu nomor untuk melihat log."
            />
          }
        >
          {data.logs.map((log) => (
            <tr key={log.id}>
              <td className="px-3.5 py-3 text-[13px] text-[var(--mut)] whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-3.5 py-3">
                <b className="text-[var(--ink)]">{log.member.name}</b>
                <div className="text-[12px] font-mono text-[var(--mut)]">
                  {log.member.code}
                </div>
              </td>
              <td className="px-3.5 py-3 text-[13px] font-mono text-[var(--mut)] whitespace-nowrap">
                {formatPhoneDisplay(log.member.phone)}
              </td>
              <td className="px-3.5 py-3 text-[13px] font-mono text-[var(--ink)]">
                {log.templateName}
              </td>
              <td className="px-3.5 py-3">
                <StatusBadge status={log.status} />
              </td>
              <td className="px-3.5 py-3 text-[12.5px] text-[var(--mut)] max-w-md">
                {log.waMessageId && (
                  <span className="block font-mono text-[11.5px] text-[var(--brand)]">
                    ID: {log.waMessageId}
                  </span>
                )}
                {log.error || "—"}
              </td>
            </tr>
          ))}
        </DataTable>

        {data.pagination.totalPages > 1 && (
          <div className="pt-4 mt-2 border-t border-[var(--line)] flex items-center justify-between text-[12.5px] text-[var(--mut)]">
            <span>
              Halaman {data.pagination.page} dari {data.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={data.pagination.page <= 1}
                onClick={() => handlePageChange(data.pagination.page - 1)}
                className="px-3 py-1.5 border border-[var(--line)] rounded-[10px] disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => handlePageChange(data.pagination.page + 1)}
                className="px-3 py-1.5 border border-[var(--line)] rounded-[10px] disabled:opacity-40 cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
