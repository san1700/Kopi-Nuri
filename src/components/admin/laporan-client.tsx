"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import { FileSpreadsheet, Download, Filter, Calendar } from "lucide-react";

interface LaporanProps {
  data: {
    filters: {
      from: string;
      to: string;
      shift: string;
    };
    shiftSummary: Record<
      "PAGI" | "SIANG" | "MALAM",
      { count: number; omzet: number; points: number }
    >;
    transactions: Array<{
      id: string;
      shift: "PAGI" | "SIANG" | "MALAM";
      amount: number;
      pointsEarned: number;
      createdAt: string | Date;
      member: { code: string; name: string };
      cashier: { name: string };
    }>;
    ledgerEntries: Array<{
      id: string;
      type: "EARN" | "REDEEM" | "BONUS" | "ADJUST";
      points: number;
      note: string | null;
      createdAt: string | Date;
      member: { code: string; name: string };
      transaction: { shift: string } | null;
      createdBy: { name: string } | null;
    }>;
  };
}

export function LaporanClient({ data }: LaporanProps) {
  const router = useRouter();
  const [from, setFrom] = useState(data.filters.from);
  const [to, setTo] = useState(data.filters.to);
  const [shift, setShift] = useState(data.filters.shift);
  const [tab, setTab] = useState<"transactions" | "ledger">("transactions");

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ from, to, shift });
    router.push(`/admin/laporan?${params.toString()}`);
  }

  function exportCsv(type: "transactions" | "ledger") {
    const params = new URLSearchParams({ type, from, to, shift });
    const link = document.createElement("a");
    link.href = `/api/admin/export?${params.toString()}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-kopi-green" />
            Laporan &amp; Export Data
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ringkasan per shift serta export Excel/CSV transaksi dan riwayat poin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportCsv("transactions")}
            className="inline-flex items-center gap-2 bg-kopi-green hover:bg-kopi-green/90 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Export Transaksi (CSV)
          </button>
          <button
            onClick={() => exportCsv("ledger")}
            className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Export Riwayat Poin (CSV)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={applyFilter}
        className="bg-white dark:bg-kopi-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex flex-wrap items-end gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Dari Tanggal
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm bg-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Sampai Tanggal
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm bg-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Shift
          </label>
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
          >
            <option value="ALL">Semua Shift</option>
            <option value="PAGI">PAGI (06–14)</option>
            <option value="SIANG">SIANG (14–22)</option>
            <option value="MALAM">MALAM (22–06)</option>
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200"
        >
          <Filter className="w-4 h-4" />
          Terapkan Filter
        </button>
      </form>

      {/* Ringkasan Per Shift */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["PAGI", "SIANG", "MALAM"] as const).map((s) => {
          const item = data.shiftSummary[s];
          return (
            <div
              key={s}
              className="bg-white dark:bg-kopi-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wide text-kopi-green">
                  SHIFT {s}
                </span>
                <span className="text-xs text-gray-400">
                  {item.count} transaksi
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {formatRupiah(item.omzet)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total poin diberikan: <strong>{item.points} poin</strong>
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabs Pratinjau */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex gap-2">
          <button
            onClick={() => setTab("transactions")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
              tab === "transactions"
                ? "bg-kopi-green text-white"
                : "text-gray-600 hover:bg-stone-100"
            }`}
          >
            Transaksi ({data.transactions.length})
          </button>
          <button
            onClick={() => setTab("ledger")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
              tab === "ledger"
                ? "bg-kopi-green text-white"
                : "text-gray-600 hover:bg-stone-100"
            }`}
          >
            Riwayat Poin ({data.ledgerEntries.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          {tab === "transactions" ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 dark:bg-stone-900/50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Kasir</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      Tidak ada transaksi pada rentang tanggal dan shift ini.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{tx.shift}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {tx.member.name}
                        </span>{" "}
                        <span className="text-xs font-mono text-gray-400">
                          ({tx.member.code})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {tx.cashier.name}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatRupiah(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-kopi-green">
                        +{tx.pointsEarned}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 dark:bg-stone-900/50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      Tidak ada mutasi poin pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  data.ledgerEntries.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {row.member.name}
                        </span>{" "}
                        <span className="text-xs font-mono text-gray-400">
                          ({row.member.code})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{row.type}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {row.note || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          row.points >= 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {row.points >= 0 ? "+" : ""}
                        {row.points}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

