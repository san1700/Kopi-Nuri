"use client";

import { useState, useEffect, useCallback } from "react";
import { getMemberLedger } from "@/app/actions/member-portal";
import { BottomNav } from "@/components/member/bottom-nav";
import { Loader2, ChevronDown, ArrowDownLeft, ArrowUpRight, Sparkles, AlertCircle } from "lucide-react";

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
  if (type === "EARN")
    return (
      <div className="w-9 h-9 rounded-[12px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center flex-shrink-0">
        <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  if (type === "REDEEM")
    return (
      <div className="w-9 h-9 rounded-[12px] bg-[var(--badbg)] text-[var(--bad)] flex items-center justify-center flex-shrink-0">
        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  if (type === "BONUS")
    return (
      <div className="w-9 h-9 rounded-[12px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  return (
    <div className="w-9 h-9 rounded-[12px] bg-[var(--warnbg)] text-[var(--warn)] flex items-center justify-center flex-shrink-0">
      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
    </div>
  );
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
          reset
            ? (result.data!.entries as LedgerEntry[])
            : [...prev, ...(result.data!.entries as LedgerEntry[])]
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
      <div
        className="flex flex-col min-h-screen"
        style={{
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 1rem))",
        }}
      >
        {/* Sticky Header with Filter Chips */}
        <div className="sticky top-0 bg-[var(--bg)]/95 backdrop-blur-md z-20 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <h1 className="text-[18px] font-extrabold text-[var(--ink)] tracking-tight">
            Riwayat Poin
          </h1>
          <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleFilterChange(f.value)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--brand)] text-white shadow-xs"
                      : "bg-[var(--card)] text-[var(--mut)] border border-[var(--line)] hover:text-[var(--ink)]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--brand)]" />
            <span className="text-[12.5px] text-[var(--mut)]">Memuat riwayat...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--in)] flex items-center justify-center mb-3 text-[var(--mut)]">
              <AlertCircle className="w-7 h-7" />
            </div>
            <p className="text-[14px] font-bold text-[var(--ink)]">Belum ada transaksi</p>
            <p className="text-[12px] text-[var(--mut)] mt-1">
              Poin yang diperoleh dari transaksi atau reward akan tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="flex-1 px-4 pt-3.5 space-y-2.5">
            {entries.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--line)] rounded-[18px] p-3.5 shadow-xs flex items-center gap-3.5"
              >
                <ActivityIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[var(--ink)] truncate">
                    {TYPE_LABEL[item.type]}
                  </p>
                  <p className="text-[11px] text-[var(--mut)] truncate mt-0.5">
                    {item.note || "—"} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <span
                  className={`text-[13.5px] font-black flex-shrink-0 ${
                    item.points >= 0 ? "text-[var(--brand)]" : "text-[var(--bad)]"
                  }`}
                >
                  {item.points >= 0 ? "+" : ""}
                  {item.points} poin
                </span>
              </div>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3.5 mt-2 text-[13px] text-[var(--brand)] font-bold flex items-center justify-center gap-2 bg-[var(--card)] border border-[var(--line)] rounded-[14px] shadow-xs active:scale-[0.99] transition-transform cursor-pointer"
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
