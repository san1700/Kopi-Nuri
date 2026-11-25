import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Shift } from "@prisma/client";

function escapeCsv(val: string | number | null | undefined): string {
  const str = val === null || val === undefined ? "" : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatWibDateTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") === "ledger" ? "ledger" : "transactions";
  const from = sp.get("from");
  const to = sp.get("to");
  const shiftParam = sp.get("shift");

  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now);
  const fromStr = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : todayStr;
  const toStr = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : todayStr;

  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);

  const startDate = new Date(
    Date.UTC(fy, fm - 1, fd, 0, 0, 0) - 7 * 60 * 60 * 1000
  );
  const endDate = new Date(
    Date.UTC(ty, tm - 1, td, 23, 59, 59, 999) - 7 * 60 * 60 * 1000
  );

  const validShifts: Shift[] = ["PAGI", "SIANG", "MALAM"];
  const shiftFilter =
    shiftParam && validShifts.includes(shiftParam as Shift)
      ? (shiftParam as Shift)
      : undefined;

  const lines: string[] = [];

  if (type === "transactions") {
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(shiftFilter ? { shift: shiftFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        member: { select: { code: true, name: true, phone: true } },
        cashier: { select: { name: true, username: true } },
      },
    });

    lines.push(
      [
        "Waktu (WIB)",
        "Shift",
        "Kode Member",
        "Nama Member",
        "No HP",
        "Kasir",
        "Nominal (Rp)",
        "Poin Didapat",
      ].join(",")
    );

    const summary: Record<Shift, { count: number; omzet: number; points: number }> = {
      PAGI: { count: 0, omzet: 0, points: 0 },
      SIANG: { count: 0, omzet: 0, points: 0 },
      MALAM: { count: 0, omzet: 0, points: 0 },
    };

    for (const tx of transactions) {
      summary[tx.shift].count += 1;
      summary[tx.shift].omzet += tx.amount;
      summary[tx.shift].points += tx.pointsEarned;

      lines.push(
        [
          escapeCsv(formatWibDateTime(tx.createdAt)),
          escapeCsv(tx.shift),
          escapeCsv(tx.member.code),
          escapeCsv(tx.member.name),
          escapeCsv(tx.member.phone),
          escapeCsv(tx.cashier.name),
          tx.amount,
          tx.pointsEarned,
        ].join(",")
      );
    }

    // Ringkasan per shift
    lines.push("");
    lines.push("RINGKASAN PER SHIFT,,,");
    lines.push("Shift,Jumlah Transaksi,Total Omzet (Rp),Total Poin");
    for (const s of validShifts) {
      lines.push(`${s},${summary[s].count},${summary[s].omzet},${summary[s].points}`);
    }
  } else {
    const ledger = await prisma.pointLedger.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(shiftFilter ? { transaction: { shift: shiftFilter } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        member: { select: { code: true, name: true } },
        transaction: { select: { shift: true } },
        createdBy: { select: { name: true } },
      },
    });

    lines.push(
      [
        "Waktu (WIB)",
        "Kode Member",
        "Nama Member",
        "Tipe",
        "Poin",
        "Shift",
        "Catatan",
        "Staf",
      ].join(",")
    );

    for (const row of ledger) {
      lines.push(
        [
          escapeCsv(formatWibDateTime(row.createdAt)),
          escapeCsv(row.member.code),
          escapeCsv(row.member.name),
          escapeCsv(row.type),
          row.points,
          escapeCsv(row.transaction?.shift ?? "-"),
          escapeCsv(row.note ?? ""),
          escapeCsv(row.createdBy?.name ?? "Sistem"),
        ].join(",")
      );
    }
  }

  // UTF-8 BOM agar Microsoft Excel langsung membaca karakter & kolom dengan benar
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const filename = `kopi-nuri-${type}-${fromStr}-sd-${toStr}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

