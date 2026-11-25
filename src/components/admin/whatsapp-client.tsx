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
  XCircle,
  Clock,
  SkipForward,
  Loader2,
  FileText,
  Users,
} from "lucide-react";

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
  if (status === "SENT") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> SENT
      </span>
    );
  }
  if (status === "SKIPPED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <SkipForward className="w-3 h-3" /> SKIPPED
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> FAILED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
      <Clock className="w-3 h-3" /> QUEUED
    </span>
  );
}

const STATUS_FILTERS = [
  { label: "Semua", value: "ALL" },
  { label: "SENT", value: "SENT" },
  { label: "SKIPPED", value: "SKIPPED" },
  { label: "FAILED", value: "FAILED" },
  { label: "QUEUED", value: "QUEUED" },
];

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-kopi-green" />
            WhatsApp Comeback
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pantau log pengiriman pesan ajakan kembali dan uji kirim template Meta Cloud API.
          </p>
        </div>

        {/* Mode badge */}
        {data.config.dryRun ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            MODE DRY RUN AKTIF (WA_DRY_RUN=true)
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            MODE LIVE ({data.config.apiVersion})
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Member Opt-In WA</span>
            <Users className="w-4 h-4 text-kopi-green" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.stats.optInCount}
          </p>
        </div>

        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Terkirim (SENT)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {data.stats.sentCount}
          </p>
        </div>

        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Dry Run (SKIPPED)</span>
            <SkipForward className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {data.stats.skippedCount}
          </p>
        </div>

        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Gagal (FAILED)</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {data.stats.failedCount}
          </p>
        </div>
      </div>

      {/* Template Info + Send Test Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template & Rules */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-kopi-green" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Template &amp; Aturan Pengiriman
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-3">
              <p className="text-gray-400">Nama Template</p>
              <p className="font-mono font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                {data.config.templateName}
              </p>
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-3">
              <p className="text-gray-400">Graph API &amp; Kredensial</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                {data.config.apiVersion} ·{" "}
                {data.config.hasCredentials ? "Terisi" : "Belum diisi"}
              </p>
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-3">
              <p className="text-gray-400">Batas Tidak Berkunjung</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                &gt; {data.config.inactiveDays} hari
              </p>
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-3">
              <p className="text-gray-400">Cooldown &amp; Jam Kirim</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                {data.config.cooldownDays} hari · 09:00–20:00 WIB
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3.5 text-xs space-y-2">
            <p className="font-semibold text-kopi-green dark:text-kopi-olive">
              Pratinjau Isi Template
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {data.config.templatePreview}
            </p>
            <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-gray-600 dark:text-gray-400">
              <span className="bg-white dark:bg-stone-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-stone-700">
                <code>{"{{1}}"}</code> = Nama Member
              </span>
              <span className="bg-white dark:bg-stone-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-stone-700">
                <code>{"{{2}}"}</code> = Saldo Poin
              </span>
            </div>
          </div>
        </div>

        {/* Form Kirim Uji */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-kopi-green" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Kirim Uji ke Satu Nomor
            </h2>
          </div>

          <form onSubmit={handleSendTest} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Nomor HP Tujuan
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-kopi-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Param {"{{1}}"} (Nama)
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-kopi-green"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Param {"{{2}}"} (Poin)
                </label>
                <input
                  type="number"
                  min={0}
                  value={testPoints}
                  onChange={(e) => setTestPoints(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-kopi-green"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-kopi-green hover:bg-kopi-green/90 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {data.config.dryRun ? "Simulasikan Kirim Uji (Dry Run)" : "Kirim Uji Sekarang"}
            </button>
          </form>

          {lastPreview && (
            <div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                Hasil Uji: {lastPreview.status} → {lastPreview.to}
                {lastPreview.loggedToMember ? " (Tercatat di WaMessageLog)" : ""}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {lastPreview.previewMessage}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Log Pengiriman */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Log Pengiriman ({data.pagination.totalCount})
          </h2>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  currentStatus === f.value
                    ? "bg-kopi-green text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 dark:bg-stone-900/50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Nomor HP</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Catatan / Pesan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Belum ada log pengiriman WhatsApp.
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {log.member.name}
                      </div>
                      <div className="text-xs font-mono text-gray-400">
                        {log.member.code}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatPhoneDisplay(log.member.phone)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300">
                      {log.templateName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-md">
                      {log.waMessageId && (
                        <span className="block font-mono text-[11px] text-emerald-700">
                          ID: {log.waMessageId}
                        </span>
                      )}
                      {log.error || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>
              Halaman {data.pagination.page} dari {data.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.pagination.page <= 1}
                onClick={() => handlePageChange(data.pagination.page - 1)}
                className="px-3 py-1.5 border rounded-lg disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => handlePageChange(data.pagination.page + 1)}
                className="px-3 py-1.5 border rounded-lg disabled:opacity-40"
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

