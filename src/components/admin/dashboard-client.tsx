"use client";

import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import {
  Users,
  ShoppingBag,
  Coins,
  Gift,
  History,
  Trophy,
  MessageCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  PageHeader,
  StatCard,
  StatusPill,
  EmptyState,
} from "@/components/ui/kopi-ui";

interface DashboardData {
  kpis: {
    totalMembers: number;
    activeMembers: number;
    newMembersThisWeek: number;
    todayTransactionCount: number;
    todayOmzet: number;
    shiftSummary: Record<
      "PAGI" | "SIANG" | "MALAM",
      { count: number; omzet: number; points: number }
    >;
    pointsCirculating: number;
    pointsRedeemed: number;
  };
  chart7Days: Array<{
    dateKey: string;
    label: string;
    omzet: number;
    transaksi: number;
    poin: number;
  }>;
  topMembers: Array<{
    id: string;
    code: string;
    name: string;
    balance: number;
    level: string;
  }>;
  recentActivities: Array<{
    id: string;
    type: "EARN" | "REDEEM" | "BONUS" | "ADJUST";
    points: number;
    note: string | null;
    createdAt: string | Date;
    member: { name: string; code: string };
  }>;
  waSummary: {
    SENT: number;
    FAILED: number;
    SKIPPED: number;
    QUEUED: number;
  };
}

function LevelPill({ level }: { level: string }) {
  const variant =
    level === "Platinum" ? "success" : level === "Gold" ? "warn" : "neutral";
  return <StatusPill variant={variant}>{level}</StatusPill>;
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const { kpis, chart7Days, topMembers, recentActivities, waSummary } = data;

  const maxOmzet = Math.max(...chart7Days.map((d) => d.omzet), 0);
  const peakDateKey =
    maxOmzet > 0
      ? chart7Days.find((d) => d.omzet === maxOmzet)?.dateKey
      : undefined;

  return (
    <div>
      <PageHeader
        title="Dashboard admin"
        subtitle="Performa loyalty Kopi Nuri hari ini dan 7 hari terakhir."
        actions={
          <Link
            href="/admin/laporan"
            className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold hover:opacity-95 transition-opacity"
          >
            Buka laporan &amp; export
          </Link>
        }
      />

      {/* 4 StatCard */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total member"
          value={kpis.totalMembers.toLocaleString("id-ID")}
          icon={<Users size={18} />}
          sub={
            <>
              <span className="text-[var(--brand)] font-bold">
                +{kpis.newMembersThisWeek}
              </span>{" "}
              member baru minggu ini ({kpis.activeMembers} aktif)
            </>
          }
        />

        <StatCard
          label="Omzet hari ini"
          value={formatRupiah(kpis.todayOmzet)}
          icon={<ShoppingBag size={18} />}
          sub={
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--mint)] text-[var(--brand)]">
                Pagi {kpis.shiftSummary.PAGI.count}
              </span>
              <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--mint)] text-[var(--brand)]">
                Siang {kpis.shiftSummary.SIANG.count}
              </span>
              <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--mint)] text-[var(--brand)]">
                Malam {kpis.shiftSummary.MALAM.count}
              </span>
            </div>
          }
        />

        <StatCard
          label="Poin beredar"
          value={`${kpis.pointsCirculating.toLocaleString("id-ID")} poin`}
          icon={<Coins size={18} />}
          sub="Akumulasi saldo seluruh member"
        />

        <StatCard
          label="Poin ditukar"
          value={`${kpis.pointsRedeemed.toLocaleString("id-ID")} poin`}
          icon={<Gift size={18} />}
          sub="Penukaran reward di kasir"
        />
      </section>

      {/* Area Chart 7 Hari + Ringkasan WA */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.9fr_1fr] gap-4 mt-4">
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--ink)]">
                Omzet 7 hari terakhir
              </h2>
              <span className="text-[12.5px] text-[var(--mut)]">
                Total belanja member per hari (WIB)
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chart7Days}
                margin={{ top: 14, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="kopiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--chart)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 5"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--mut)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--mut)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)} jt`
                      : v >= 1_000
                      ? `${Math.round(v / 1_000)} rb`
                      : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    formatRupiah(Number(value ?? 0)),
                    "Omzet",
                  ]}
                  labelStyle={{ color: "#FFFFFF", fontWeight: 700 }}
                  itemStyle={{ color: "#DDF3E4" }}
                  contentStyle={{
                    backgroundColor: "var(--side)",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "12px",
                    color: "#FFFFFF",
                    padding: "6px 10px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="omzet"
                  stroke="var(--chart)"
                  strokeWidth={3}
                  fill="url(#kopiAreaGrad)"
                  dot={(props) => {
                    const { cx, cy, payload } = props as {
                      cx?: number;
                      cy?: number;
                      payload?: { dateKey?: string };
                    };
                    if (
                      cx === undefined ||
                      cy === undefined ||
                      !peakDateKey ||
                      payload?.dateKey !== peakDateKey
                    ) {
                      return <g key={payload?.dateKey ?? "dot"} />;
                    }
                    return (
                      <circle
                        key={`peak-${payload.dateKey}`}
                        cx={cx}
                        cy={cy}
                        r={7}
                        fill="#F2506A"
                        stroke="var(--card)"
                        strokeWidth={3}
                      />
                    );
                  }}
                  activeDot={{
                    r: 6,
                    fill: "var(--chart)",
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kartu WhatsApp 7 Hari */}
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] flex flex-col justify-between"
          style={{ boxShadow: "var(--sh)" }}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <h2 className="text-[16px] font-bold text-[var(--ink)] flex items-center gap-2">
                <MessageCircle size={18} className="text-[var(--brand)]" />
                WhatsApp (7 hari)
              </h2>
              <Link
                href="/admin/whatsapp"
                className="text-[13px] font-semibold text-[var(--brand)] hover:underline"
              >
                Detail
              </Link>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-3.5 py-3 rounded-[14px] font-semibold bg-[var(--mint)] text-[var(--brand)]">
                <span>Terkirim</span>
                <b className="text-[20px]">{waSummary.SENT}</b>
              </div>
              <div className="flex items-center justify-between px-3.5 py-3 rounded-[14px] font-semibold bg-[var(--warnbg)] text-[var(--warn)]">
                <span>Dilewati (dry-run)</span>
                <b className="text-[20px]">{waSummary.SKIPPED}</b>
              </div>
              <div className="flex items-center justify-between px-3.5 py-3 rounded-[14px] font-semibold bg-[var(--badbg)] text-[var(--bad)]">
                <span>Gagal</span>
                <b className="text-[20px]">{waSummary.FAILED}</b>
              </div>
            </div>
          </div>

          <p className="text-[12.5px] text-[var(--mut)] mt-3">
            Total 7 hari:{" "}
            {waSummary.SENT + waSummary.SKIPPED + waSummary.FAILED} pesan diproses.
          </p>
        </div>
      </section>

      {/* Top 5 Member + 5 Aktivitas Terbaru */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Top 5 Member */}
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <h2 className="text-[16px] font-bold text-[var(--ink)]">
              Top 5 member
            </h2>
            <Link
              href="/admin/member"
              className="text-[13px] font-semibold text-[var(--brand)] hover:underline"
            >
              Semua member
            </Link>
          </div>

          {topMembers.length === 0 ? (
            <EmptyState
              icon={<Trophy size={24} />}
              title="Belum ada peringkat member"
              description="Daftarkan member dan catat transaksi pertama di kasir."
            />
          ) : (
            <div>
              {topMembers.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[var(--line)] last:border-0"
                >
                  <div
                    className={`w-9 h-9 rounded-full grid place-items-center font-extrabold shrink-0 ${
                      idx === 0
                        ? "bg-[var(--olive)] text-[#10331F]"
                        : "bg-[var(--mint)] text-[var(--brand)]"
                    }`}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--ink)] truncate">
                      {m.name}
                    </div>
                    <small className="block text-[var(--mut)] text-[12px]">
                      Peringkat {idx + 1} · {m.code}
                    </small>
                  </div>
                  <LevelPill level={m.level} />
                  <b className="text-[var(--ink)] whitespace-nowrap ml-1">
                    {m.balance.toLocaleString("id-ID")} poin
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5 Aktivitas Terbaru */}
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <h2 className="text-[16px] font-bold text-[var(--ink)]">
              5 aktivitas terbaru
            </h2>
            <Link
              href="/admin/riwayat"
              className="text-[13px] font-semibold text-[var(--brand)] hover:underline"
            >
              Lihat semua
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <EmptyState
              icon={<History size={24} />}
              title="Belum ada aktivitas poin"
              description="Aktivitas belanja, bonus, dan penukaran akan muncul di sini."
            />
          ) : (
            <div>
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[var(--line)] last:border-0"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-[var(--mint)] text-[var(--brand)] grid place-items-center shrink-0">
                    <History size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--ink)] truncate">
                      {act.member.name} — {act.note || act.type}
                    </div>
                    <small className="block text-[var(--mut)] text-[12px]">
                      {new Date(act.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                  <b
                    className={`whitespace-nowrap ${
                      act.points >= 0
                        ? "text-[var(--brand)]"
                        : "text-[var(--bad)]"
                    }`}
                  >
                    {act.points >= 0 ? "+" : ""}
                    {act.points} poin
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
