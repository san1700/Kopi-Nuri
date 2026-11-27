"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import { FileSpreadsheet, Download, Search } from "lucide-react";
import {
  PageHeader,
  DataTable,
  StatusPill,
  EmptyState,
  FormField,
  FilterChips,
} from "@/components/ui/kopi-ui";

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

  function shiftPill(s: string) {
    if (s === "SIANG") return <StatusPill variant="warn">Siang</StatusPill>;
    if (s === "PAGI") return <StatusPill variant="success">Pagi</StatusPill>;
    return <StatusPill variant="neutral">Malam</StatusPill>;
  }

  return (
    <div>
      <PageHeader
        title="Laporan &amp; export data"
        subtitle="Ringkasan per shift dan export CSV transaksi serta riwayat poin."
        actions={
          <>
            <button
              type="button"
              onClick={() => exportCsv("transactions")}
              className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold cursor-pointer hover:opacity-95"
            >
              <Download size={16} />
              Export transaksi (CSV)
            </button>
            <button
              type="button"
              onClick={() => exportCsv("ledger")}
              className="inline-flex items-center gap-2 bg-[var(--side)] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold cursor-pointer hover:opacity-95"
            >
              <Download size={16} />
              Export riwayat poin (CSV)
            </button>
          </>
        }
      />

      {/* Filter Bar */}
      <form
        onSubmit={applyFilter}
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Dari tanggal" className="min-w-[160px]">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            />
          </FormField>

          <FormField label="Sampai tanggal" className="min-w-[160px]">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            />
          </FormField>

          <FormField label="Shift" className="min-w-[160px]">
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            >
              <option value="ALL">Semua shift</option>
              <option value="PAGI">Pagi (06–14)</option>
              <option value="SIANG">Siang (14–22)</option>
              <option value="MALAM">Malam (22–06)</option>
            </select>
          </FormField>

          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold cursor-pointer"
          >
            <Search size={16} />
            Terapkan filter
          </button>
        </div>
      </form>

      {/* 3 Kartu Ringkasan Per Shift */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {(["PAGI", "SIANG", "MALAM"] as const).map((s) => {
          const item = data.shiftSummary[s];
          return (
            <div
              key={s}
              className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
              style={{ boxShadow: "var(--sh)" }}
            >
              <div className="flex items-center justify-between text-[var(--mut)] font-medium">
                <span>Shift {s.toLowerCase()}</span>
                <span className="text-[12.5px]">{item.count} transaksi</span>
              </div>
              <div className="text-[28px] font-extrabold tracking-[-0.6px] mt-2 mb-1 text-[var(--ink)]">
                {formatRupiah(item.omzet)}
              </div>
              <div className="text-[12.5px] text-[var(--mut)]">
                Poin diberikan: <b className="text-[var(--ink)]">{item.points} poin</b>
              </div>
            </div>
          );
        })}
      </section>

      {/* Tab Transaksi / Riwayat Poin */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] mt-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="mb-3.5">
          <FilterChips
            value={tab}
            onChange={setTab}
            options={[
              { label: `Transaksi (${data.transactions.length})`, value: "transactions" },
              { label: `Riwayat poin (${data.ledgerEntries.length})`, value: "ledger" },
            ]}
          />
        </div>

        {tab === "transactions" ? (
          <DataTable
            columns={["Waktu", "Shift", "Member", "Kasir", "Nominal", "Poin"]}
            isEmpty={data.transactions.length === 0}
            empty={
              <EmptyState
                icon={<FileSpreadsheet size={24} />}
                title="Tidak ada transaksi"
                description="Tidak ada transaksi pada rentang tanggal dan shift ini."
              />
            }
          >
            {data.transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="px-3.5 py-3 text-[13px] text-[var(--mut)] whitespace-nowrap">
                  {new Date(tx.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-3.5 py-3">{shiftPill(tx.shift)}</td>
                <td className="px-3.5 py-3 font-medium text-[var(--ink)]">
                  {tx.member.name}{" "}
                  <span className="text-[12px] font-mono text-[var(--mut)]">
                    ({tx.member.code})
                  </span>
                </td>
                <td className="px-3.5 py-3 text-[13px] text-[var(--mut)]">
                  {tx.cashier.name}
                </td>
                <td className="px-3.5 py-3 font-semibold text-[var(--ink)] whitespace-nowrap">
                  {formatRupiah(tx.amount)}
                </td>
                <td className="px-3.5 py-3 font-bold text-[var(--brand)] whitespace-nowrap">
                  +{tx.pointsEarned}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <DataTable
            columns={["Waktu", "Member", "Tipe", "Catatan", "Poin"]}
            isEmpty={data.ledgerEntries.length === 0}
            empty={
              <EmptyState
                icon={<FileSpreadsheet size={24} />}
                title="Tidak ada riwayat poin"
                description="Tidak ada mutasi poin pada rentang tanggal ini."
              />
            }
          >
            {data.ledgerEntries.map((row) => (
              <tr key={row.id}>
                <td className="px-3.5 py-3 text-[13px] text-[var(--mut)] whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-3.5 py-3 font-medium text-[var(--ink)]">
                  {row.member.name}{" "}
                  <span className="text-[12px] font-mono text-[var(--mut)]">
                    ({row.member.code})
                  </span>
                </td>
                <td className="px-3.5 py-3 text-[13px] font-semibold">{row.type}</td>
                <td className="px-3.5 py-3 text-[13px] text-[var(--mut)]">
                  {row.note || "—"}
                </td>
                <td
                  className={`px-3.5 py-3 font-bold whitespace-nowrap ${
                    row.points >= 0 ? "text-[var(--brand)]" : "text-[var(--bad)]"
                  }`}
                >
                  {row.points >= 0 ? "+" : ""}
                  {row.points}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </div>
  );
}
