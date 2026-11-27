"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { LedgerType } from "@prisma/client";
import { getLedgerList } from "@/app/actions/ledger";
import { formatTanggalWaktu } from "@/lib/format";
import { toast } from "sonner";
import { AdjustPointsModal } from "@/components/adjust-points-modal";
import {
  PageHeader,
  DataTable,
  StatusPill,
  EmptyState,
} from "@/components/ui/kopi-ui";

interface LedgerHistoryViewProps {
  title?: string;
  subtitle?: string;
  allowAdjust?: boolean;
}

interface LedgerItem {
  id: string;
  points: number;
  type: LedgerType;
  note: string | null;
  createdAt: Date | string;
  member: {
    id: string;
    code: string;
    name: string;
    phone: string;
  };
  createdBy: {
    id: string;
    name: string;
    role: string;
  } | null;
  transaction: {
    id: string;
    amount: number;
    shift: string;
  } | null;
  redemption: {
    id: string;
    voucherCode: string;
    reward: {
      name: string;
    };
  } | null;
}

export function LedgerHistoryView({
  title = "Riwayat poin & mutasi",
  subtitle = "Pantau semua mutasi poin: belanja, bonus daftar, penukaran, dan koreksi admin.",
  allowAdjust = false,
}: LedgerHistoryViewProps) {
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<LedgerType | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(() => {
    let isMounted = true;
    getLedgerList({
      search: debouncedSearch,
      type,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: 15,
    })
      .then((res) => {
        if (isMounted) {
          setItems(res.items as LedgerItem[]);
          setTotalPages(res.totalPages);
          setTotalCount(res.totalCount);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Gagal memuat riwayat poin";
          toast.error(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, type, startDate, endDate, page]);

  useEffect(() => {
    return loadData();
  }, [loadData]);

  function resetFilters() {
    setSearch("");
    setType("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  function typeLabel(t: LedgerType) {
    if (t === "EARN") return { label: "Belanja", variant: "success" as const };
    if (t === "REDEEM") return { label: "Tukar", variant: "warn" as const };
    if (t === "BONUS") return { label: "Bonus daftar", variant: "neutral" as const };
    return { label: "Koreksi", variant: "danger" as const };
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`${subtitle} (${totalCount} entri)`}
        actions={
          allowAdjust ? (
            <button
              type="button"
              onClick={() => setAdjustModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#D97A06] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold cursor-pointer hover:opacity-95"
            >
              <SlidersHorizontal size={16} />
              Koreksi poin (ADJUST)
            </button>
          ) : undefined
        }
      />

      {/* Filter Bar */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari member / kode / HP"
            className="flex-1 min-w-[200px] border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--brand)]"
          />

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as LedgerType | "ALL");
              setPage(1);
            }}
            className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
          >
            <option value="ALL">Semua jenis mutasi</option>
            <option value="EARN">Belanja (Earn)</option>
            <option value="BONUS">Bonus daftar</option>
            <option value="REDEEM">Penukaran (Redeem)</option>
            <option value="ADJUST">Koreksi (Adjust)</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            aria-label="Dari tanggal"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            aria-label="Sampai tanggal"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13px] font-semibold cursor-pointer"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13px] font-semibold cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Tabel Mutasi */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] mt-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        {loading ? (
          <div className="py-12 text-center text-[var(--mut)]">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[var(--brand)]" />
            Memuat riwayat poin...
          </div>
        ) : (
          <DataTable
            columns={[
              "Waktu",
              "Member",
              "Tipe",
              "Perubahan poin",
              "Keterangan",
              "Petugas",
            ]}
            isEmpty={items.length === 0}
            empty={
              <EmptyState
                icon={<History size={24} />}
                title="Tidak ada riwayat yang cocok"
                description="Ubah filter pencarian atau rentang tanggal."
              />
            }
          >
            {items.map((item) => {
              const badge = typeLabel(item.type);
              return (
                <tr key={item.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                  <td className="px-3.5 py-3 text-[13px] text-[var(--mut)] whitespace-nowrap">
                    {formatTanggalWaktu(item.createdAt)}
                  </td>
                  <td className="px-3.5 py-3">
                    <b className="text-[var(--ink)]">{item.member.name}</b>
                    <div className="text-[12px] font-mono text-[var(--mut)]">
                      {item.member.code}
                    </div>
                  </td>
                  <td className="px-3.5 py-3">
                    <StatusPill variant={badge.variant}>{badge.label}</StatusPill>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <b
                      className={
                        item.points >= 0
                          ? "text-[var(--brand)]"
                          : "text-[var(--bad)]"
                      }
                    >
                      {item.points >= 0 ? `+${item.points}` : item.points}
                    </b>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-[var(--ink)]">
                    {item.note || "—"}
                    {item.redemption && (
                      <span className="block text-[12px] font-mono text-[var(--mut)]">
                        Voucher: {item.redemption.voucherCode}
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-[var(--mut)] whitespace-nowrap">
                    {item.createdBy ? item.createdBy.name : "Sistem"}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}

        {/* Paginasi */}
        <div className="pt-4 mt-2 border-t border-[var(--line)] flex items-center justify-between text-[12.5px] text-[var(--mut)]">
          <span>
            Menampilkan halaman <b className="text-[var(--ink)]">{page}</b> dari{" "}
            <b className="text-[var(--ink)]">{totalPages || 1}</b>
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 border border-[var(--line)] rounded-[10px] bg-[var(--card)] text-[var(--ink)] disabled:opacity-40 cursor-pointer"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 border border-[var(--line)] rounded-[10px] bg-[var(--card)] text-[var(--ink)] disabled:opacity-40 cursor-pointer"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {adjustModalOpen && (
        <AdjustPointsModal
          onClose={() => setAdjustModalOpen(false)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
