"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Shift } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Akses ditolak: hanya ADMIN yang diizinkan");
  }
  return session.user;
}

function parseWibRange(from?: string, to?: string) {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now);

  const defaultFromDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const defaultFromStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(defaultFromDate);

  const fromStr = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defaultFromStr;
  const toStr = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : todayStr;

  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);

  // 00:00:00 WIB -> UTC -7h
  const startDate = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0) - 7 * 60 * 60 * 1000);
  // 23:59:59.999 WIB -> UTC -7h
  const endDate = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59, 999) - 7 * 60 * 60 * 1000);

  return { fromStr, toStr, startDate, endDate };
}

export async function getLaporanData(params: {
  from?: string;
  to?: string;
  shift?: string;
}) {
  await requireAdmin();

  const { fromStr, toStr, startDate, endDate } = parseWibRange(
    params.from,
    params.to
  );

  const validShifts: Shift[] = ["PAGI", "SIANG", "MALAM"];
  const shiftFilter =
    params.shift && validShifts.includes(params.shift as Shift)
      ? (params.shift as Shift)
      : undefined;

  const txWhere = {
    createdAt: { gte: startDate, lte: endDate },
    ...(shiftFilter ? { shift: shiftFilter } : {}),
  };

  const ledgerWhere = {
    createdAt: { gte: startDate, lte: endDate },
    ...(shiftFilter ? { transaction: { shift: shiftFilter } } : {}),
  };

  const [transactions, allPeriodTransactions, ledgerEntries] = await Promise.all([
    prisma.transaction.findMany({
      where: txWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        member: { select: { code: true, name: true } },
        cashier: { select: { name: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { shift: true, amount: true, pointsEarned: true },
    }),
    prisma.pointLedger.findMany({
      where: ledgerWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        member: { select: { code: true, name: true } },
        transaction: { select: { shift: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const shiftSummary: Record<
    Shift,
    { count: number; omzet: number; points: number }
  > = {
    PAGI: { count: 0, omzet: 0, points: 0 },
    SIANG: { count: 0, omzet: 0, points: 0 },
    MALAM: { count: 0, omzet: 0, points: 0 },
  };

  for (const tx of allPeriodTransactions) {
    shiftSummary[tx.shift].count += 1;
    shiftSummary[tx.shift].omzet += tx.amount;
    shiftSummary[tx.shift].points += tx.pointsEarned;
  }

  return {
    filters: {
      from: fromStr,
      to: toStr,
      shift: shiftFilter ?? "ALL",
    },
    shiftSummary,
    transactions,
    ledgerEntries,
  };
}

