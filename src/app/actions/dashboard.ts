"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getLevelFromTotal } from "@/lib/points";
import { Shift } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Akses ditolak: hanya ADMIN yang diizinkan");
  }
  return session.user;
}

/**
 * Helper konversi Date ke string tanggal WIB YYYY-MM-DD
 */
function toWibDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Awal hari ini dalam WIB sebagai UTC Date
 */
function getWibDayStart(daysAgo = 0): Date {
  const now = new Date();
  const wibTodayStr = toWibDateKey(now);
  const [y, m, d] = wibTodayStr.split("-").map(Number);
  // 00:00:00 WIB = 17:00:00 UTC hari sebelumnya
  const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 7 * 60 * 60 * 1000);
  startUtc.setUTCDate(startUtc.getUTCDate() - daysAgo);
  return startUtc;
}

export async function getAdminDashboardData() {
  await requireAdmin();

  const todayStart = getWibDayStart(0);
  const sevenDaysStart = getWibDayStart(6); // 7 hari termasuk hari ini
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalMembers,
    activeMembers,
    newMembersThisWeek,
    todayTransactions,
    pointsCirculatingAgg,
    pointsRedeemedAgg,
    last7DaysTransactions,
    balanceGroups,
    earnedGroups,
    recentActivities,
    waLogsLast7Days,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { isActive: true } }),
    prisma.member.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { shift: true, amount: true, pointsEarned: true },
    }),
    prisma.pointLedger.aggregate({ _sum: { points: true } }),
    prisma.pointLedger.aggregate({
      where: { type: "REDEEM" },
      _sum: { points: true },
    }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: sevenDaysStart } },
      select: { amount: true, pointsEarned: true, createdAt: true },
    }),
    prisma.pointLedger.groupBy({
      by: ["memberId"],
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 10,
    }),
    prisma.pointLedger.groupBy({
      by: ["memberId"],
      where: {
        OR: [
          { type: "EARN" },
          { type: "BONUS" },
          { type: "ADJUST", points: { gt: 0 } },
        ],
      },
      _sum: { points: true },
    }),
    prisma.pointLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        member: { select: { name: true, code: true } },
      },
    }),
    prisma.waMessageLog.groupBy({
      by: ["status"],
      where: { createdAt: { gte: weekAgo } },
      _count: { _all: true },
    }),
  ]);

  // Transaksi & omzet hari ini per shift
  const shiftSummary: Record<Shift, { count: number; omzet: number; points: number }> = {
    PAGI: { count: 0, omzet: 0, points: 0 },
    SIANG: { count: 0, omzet: 0, points: 0 },
    MALAM: { count: 0, omzet: 0, points: 0 },
  };
  let todayOmzet = 0;
  for (const tx of todayTransactions) {
    todayOmzet += tx.amount;
    shiftSummary[tx.shift].count += 1;
    shiftSummary[tx.shift].omzet += tx.amount;
    shiftSummary[tx.shift].points += tx.pointsEarned;
  }

  // Grafik 7 hari
  const chartMap = new Map<
    string,
    { dateKey: string; label: string; omzet: number; transaksi: number; poin: number }
  >();
  for (let i = 6; i >= 0; i--) {
    const d = getWibDayStart(i);
    const key = toWibDateKey(d);
    const label = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
    chartMap.set(key, { dateKey: key, label, omzet: 0, transaksi: 0, poin: 0 });
  }
  for (const tx of last7DaysTransactions) {
    const key = toWibDateKey(tx.createdAt);
    const bucket = chartMap.get(key);
    if (bucket) {
      bucket.omzet += tx.amount;
      bucket.transaksi += 1;
      bucket.poin += tx.pointsEarned;
    }
  }
  const chart7Days = Array.from(chartMap.values());

  // Top 5 member aktif berdasarkan saldo poin
  const earnedMap = new Map<string, number>();
  for (const g of earnedGroups) {
    earnedMap.set(g.memberId, g._sum.points ?? 0);
  }
  const topIds = balanceGroups.map((g) => g.memberId);
  const topMembersData =
    topIds.length > 0
      ? await prisma.member.findMany({
          where: { id: { in: topIds }, isActive: true },
          select: { id: true, code: true, name: true },
        })
      : [];
  const memberInfoMap = new Map(topMembersData.map((m) => [m.id, m]));

  const topMembers: Array<{
    id: string;
    code: string;
    name: string;
    balance: number;
    level: string;
  }> = [];

  for (const g of balanceGroups) {
    const info = memberInfoMap.get(g.memberId);
    if (!info) continue;
    const totalEarned = earnedMap.get(g.memberId) ?? 0;
    const level = await getLevelFromTotal(totalEarned);
    topMembers.push({
      id: info.id,
      code: info.code,
      name: info.name,
      balance: g._sum.points ?? 0,
      level,
    });
    if (topMembers.length >= 5) break;
  }

  // Ringkasan WhatsApp 7 hari terakhir
  const waSummary = { SENT: 0, FAILED: 0, SKIPPED: 0, QUEUED: 0 };
  for (const row of waLogsLast7Days) {
    waSummary[row.status] = row._count._all;
  }

  return {
    kpis: {
      totalMembers,
      activeMembers,
      newMembersThisWeek,
      todayTransactionCount: todayTransactions.length,
      todayOmzet,
      shiftSummary,
      pointsCirculating: pointsCirculatingAgg._sum.points ?? 0,
      pointsRedeemed: Math.abs(pointsRedeemedAgg._sum.points ?? 0),
    },
    chart7Days,
    topMembers,
    recentActivities,
    waSummary,
  };
}

