"use client";

import { useState, useEffect, useCallback } from "react";
import { getMemberLedger } from "@/app/actions/member-portal";
import { BottomNav } from "@/components/member/bottom-nav";
import { Loader2, ChevronDown } from "lucide-react";

type LedgerType = "EARN" | "BONUS" | "REDEEM" | "ADJUST";

interface LedgerEntry {
  id: string;
  type: LedgerType;
  points: number;
  note: string | null;
  createdAt: string | Date;
}

const TYPE_LABEL: Record<LedgerType, string> = {
  EARN: "Belanja",
  BONUS: "Bonus",
  REDEEM: "Tukar Reward",
  ADJUST: "Koreksi",
};

function ActivityIcon({ type }: { type: LedgerType }) {
  if (type === "EARN") return <span className="text-green-500 text-lg">▲</span>;
  if (type === "REDEEM") return <span className="text-red-500 text-lg">▼</span>;
  if (type === "BONUS") return <span className="text-blue-500 text-lg">★</span>;
  return <span className="text-yellow-500 text-lg">⚡</span>;
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FILTERS: { label: string; value: string }[] = [
  { label: "Semua", value: "ALL" },
  { label: "Belanja", value: "EARN" },
  { label: "Bonus", value: "BONUS" },
  { label: "Tukar", value: "REDEEM" },
  { label: "Koreksi", value: "ADJUST" },
];

export default function RiwayatPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(
    async (p: number, f: string, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const result = await getMemberLedger({
        page: p,
        pageSize: 20,
        type: f === "ALL" ? undefined : f,
      });

      if (result.success && result.data) {
        setEntries((prev) =>
          reset ? (result.data!.entries as LedgerEntry[]) : [...prev, ...(result.data!.entries as LedgerEntry[])]
        );
        setHasMore(result.data.hasMore);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    []
  );

  useEffect(() => {
    let active = true;
    getMemberLedger({
      page: 1,
      pageSize: 20,
      type: filter === "ALL" ? undefined : filter,
    }).then((result) => {
      if (!active) return;
      if (result.success && result.data) {
        setEntries(result.data.entries as LedgerEntry[]);
        setHasMore(result.data.hasMore);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [filter]);

  function handleFilterChange(nextFilter: string) {
    setLoading(true);
    setPage(1);
    setFilter(nextFilter);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, filter, false);
  }

  return (
    <>
      <div className="flex flex-col min-h-screen pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-[#FDF8F0] z-10 px-4 pt-6 pb-3 border-b border-stone-100">
          <h1 className="text-lg font-bold text-stone-800">Riwayat Poin</h1>
          {/* Filter chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-[#1F5C2E] text-white"
                    : "bg-white text-stone-600 border border-stone-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1F5C2E]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <p className="text-stone-400 text-sm">Belum ada transaksi poin</p>
          </div>
        ) : (
          <div className="flex-1 px-4 pt-2">
            <div className="space-y-1">
              {entries.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 border-b border-stone-100"
                >
                  <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {TYPE_LABEL[item.type]}
                    </p>
                    <p className="text-xs text-stone-400 truncate">
                      {item.note ?? "—"} · {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold flex-shrink-0 ${
                      item.points >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {item.points >= 0 ? "+" : ""}{item.points} poin
                  </span>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-4 text-sm text-[#1F5C2E] font-medium flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Muat lebih banyak
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </>
  );
}

