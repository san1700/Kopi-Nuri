"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { LedgerType } from "@prisma/client";
import { getLedgerList } from "@/app/actions/ledger";
import { formatTanggalWaktu } from "@/lib/format";
import { toast } from "sonner";
import { AdjustPointsModal } from "@/components/adjust-points-modal";

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
  title = "Riwayat Poin & Mutasi Ledger",
  subtitle = "Semua mutasi poin member: perolehan belanja, bonus, penukaran reward, dan penyesuaian.",
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

  const typeConfig: Record<
    LedgerType,
    { label: string; badge: string; icon: React.ReactNode; textClass: string }
  > = {
    EARN: {
      label: "Belanja (Earn)",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: <ArrowUpRight size={14} className="text-emerald-600" />,
      textClass: "text-emerald-600 dark:text-emerald-400 font-bold",
    },
    BONUS: {
      label: "Bonus",
      badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: <Gift size={14} className="text-blue-600" />,
      textClass: "text-blue-600 dark:text-blue-400 font-bold",
    },
    REDEEM: {
      label: "Penukaran (Redeem)",
      badge: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800",
      icon: <ArrowDownLeft size={14} className="text-red-600" />,
      textClass: "text-kopi-coral font-bold",
    },
    ADJUST: {
      label: "Koreksi (Adjust)",
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      icon: <SlidersHorizontal size={14} className="text-amber-600" />,
      textClass: "text-amber-600 dark:text-amber-400 font-bold",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History className="text-kopi-green dark:text-kopi-olive" />
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        </div>

        {allowAdjust && (
          <button
            onClick={() => setAdjustModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors shrink-0"
          >
            <SlidersHorizontal size={15} />
            Koreksi Poin (ADJUST)
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pencarian Member */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari member / kode / HP..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
          </div>

          {/* Filter Tipe Mutasi */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as LedgerType | "ALL");
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors appearance-none"
            >
              <option value="ALL">Semua Jenis Mutasi</option>
              <option value="EARN">Belanja (EARN)</option>
              <option value="BONUS">Bonus (BONUS)</option>
              <option value="REDEEM">Penukaran (REDEEM)</option>
              <option value="ADJUST">Koreksi (ADJUST)</option>
            </select>
          </div>

          {/* Filter Tanggal Mulai */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
          </div>

          {/* Filter Tanggal Akhir */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>
            Ditemukan <strong>{totalCount}</strong> entri mutasi
          </span>
          <div className="flex gap-2">
            {(search || type !== "ALL" || startDate || endDate) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-kopi-coral hover:underline"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Segarkan
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Mutasi Ledger */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Tipe</th>
                <th className="px-5 py-3.5 text-right">Perubahan Poin</th>
                <th className="px-5 py-3.5">Keterangan</th>
                <th className="px-5 py-3.5">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-kopi-green" />
                    Memuat data ledger...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                    Tidak ada riwayat mutasi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const cfg = typeConfig[item.type];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* Waktu */}
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTanggalWaktu(item.createdAt)}
                      </td>

                      {/* Member */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                          {item.member.name}
                        </p>
                        <p className="font-mono text-[11px] text-kopi-green dark:text-kopi-olive font-semibold">
                          {item.member.code}
                        </p>
                      </td>

                      {/* Tipe Badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border font-medium ${cfg.badge}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>

                      {/* Poin Mutasi */}
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm font-mono ${cfg.textClass}`}>
                          {item.points > 0 ? `+${item.points}` : item.points}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">pts</span>
                      </td>

                      {/* Keterangan */}
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300 max-w-xs">
                        {item.note || "—"}
                        {item.redemption && (
                          <span className="block font-mono text-[11px] text-gray-400 mt-0.5">
                            Voucher: {item.redemption.voucherCode}
                          </span>
                        )}
                      </td>

                      {/* Petugas */}
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {item.createdBy ? item.createdBy.name : "Sistem"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            Menampilkan halaman <span className="font-semibold text-gray-700 dark:text-gray-300">{page}</span> dari{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{totalPages || 1}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Koreksi Poin (ADJUST) */}
      {adjustModalOpen && (
        <AdjustPointsModal
          onClose={() => setAdjustModalOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
