"use client";

import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import {
  Users,
  ShoppingBag,
  Coins,
  Gift,
  MessageCircle,
  Trophy,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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

function LevelBadge({ level }: { level: string }) {
  const cls =
    level === "Platinum"
      ? "bg-purple-100 text-purple-700"
      : level === "Gold"
      ? "bg-amber-100 text-amber-700"
      : "bg-stone-100 text-stone-700";
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {level}
    </span>
  );
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const { kpis, chart7Days, topMembers, recentActivities, waSummary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard Admin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ringkasan performa loyalty Kopi Nuri hari ini &amp; 7 hari terakhir.
          </p>
        </div>
        <Link
          href="/admin/laporan"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-kopi-green hover:underline"
        >
          Buka Laporan &amp; Export <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Member */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Member Total</span>
            <Users className="w-4 h-4 text-kopi-green" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1.5">
            {kpis.totalMembers.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">
            +{kpis.newMembersThisWeek} member baru minggu ini ({kpis.activeMembers} aktif)
          </p>
        </div>

        {/* Transaksi & Omzet Hari Ini */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Omzet &amp; Transaksi Hari Ini</span>
            <ShoppingBag className="w-4 h-4 text-kopi-green" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1.5">
            {formatRupiah(kpis.todayOmzet)}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
              Pagi: {kpis.shiftSummary.PAGI.count}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
              Siang: {kpis.shiftSummary.SIANG.count}
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
              Malam: {kpis.shiftSummary.MALAM.count}
            </span>
          </div>
        </div>

        {/* Poin Beredar */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Poin Beredar (Saldo Total)</span>
            <Coins className="w-4 h-4 text-kopi-olive" />
          </div>
          <p className="text-2xl font-bold text-kopi-green dark:text-kopi-olive mt-1.5">
            {kpis.pointsCirculating.toLocaleString("id-ID")} poin
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Akumulasi saldo seluruh member dari ledger
          </p>
        </div>

        {/* Poin Ditukar */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Poin Ditukar</span>
            <Gift className="w-4 h-4 text-kopi-coral" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1.5">
            {kpis.pointsRedeemed.toLocaleString("id-ID")} poin
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Penukaran reward di kasir
          </p>
        </div>
      </div>

      {/* Chart 7 Hari + Ringkasan WA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Grafik Omzet 7 Hari Terakhir
              </h2>
              <p className="text-xs text-gray-400">
                Total nilai belanja member per hari (WIB)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart7Days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(1)}jt`
                      : v >= 1000
                      ? `${Math.round(v / 1000)}rb`
                      : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => {
                    if (name === "omzet") return [formatRupiah(Number(value ?? 0)), "Omzet"];
                    return [String(value ?? 0), String(name)];
                  }}
                  contentStyle={{
                    borderRadius: "10px",
                    borderColor: "#e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="omzet" fill="#1F5C2E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ringkasan WhatsApp 7 Hari */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-kopi-green" />
                WhatsApp (7 Hari)
              </h2>
              <Link
                href="/admin/whatsapp"
                className="text-xs text-kopi-green font-medium hover:underline"
              >
                Detail →
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Terkirim (SENT)
                </span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {waSummary.SENT}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30">
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Dilewati / Dry-Run (SKIPPED)
                </span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {waSummary.SKIPPED}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/70 dark:bg-red-950/30">
                <span className="text-xs font-medium text-red-800 dark:text-red-300">
                  Gagal (FAILED)
                </span>
                <span className="text-lg font-bold text-red-700 dark:text-red-400">
                  {waSummary.FAILED}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-4">
            Total 7 hari terakhir: {waSummary.SENT + waSummary.SKIPPED + waSummary.FAILED} pesan diproses.
          </p>
        </div>
      </div>

      {/* Top 5 Member & 5 Aktivitas Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Member */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top 5 Member
            </h2>
            <Link
              href="/admin/member"
              className="text-xs text-kopi-green font-medium hover:underline"
            >
              Semua member →
            </Link>
          </div>

          {topMembers.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Belum ada data saldo member.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {topMembers.map((m, idx) => (
                <div key={m.id} className="py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-bold flex items-center justify-center text-stone-600 dark:text-stone-300">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {m.name}
                    </p>
                    <p className="text-xs font-mono text-gray-400">{m.code}</p>
                  </div>
                  <LevelBadge level={m.level} />
                  <span className="text-sm font-bold text-kopi-green dark:text-kopi-olive ml-2">
                    {m.balance.toLocaleString("id-ID")} poin
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5 Aktivitas Terbaru */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-kopi-green" />
              5 Aktivitas Terbaru
            </h2>
            <Link
              href="/admin/riwayat"
              className="text-xs text-kopi-green font-medium hover:underline"
            >
              Lihat semua →
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Belum ada aktivitas poin.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {act.member.name}{" "}
                      <span className="text-xs font-mono text-gray-400">
                        ({act.member.code})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {act.note || act.type} ·{" "}
                      {new Date(act.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${
                      act.points >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {act.points >= 0 ? "+" : ""}
                    {act.points} poin
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

