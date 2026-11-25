"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  calcEarnedPoints,
  createTransaction,
  getMemberBalance,
  getMemberLevelInfo,
  LevelInfo,
} from "@/lib/points";
import { normalizePhone } from "@/lib/phone";
import { Shift } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CashierMemberProfile {
  id: string;
  code: string;
  name: string;
  phone: string;
  isActive: boolean;
  balance: number;
  levelInfo: LevelInfo;
}

/**
 * Cari member berdasarkan QR scan (kode) atau manual input (kode/HP)
 * - Otomatis trim & uppercase kode (mis. MBR-000001)
 * - Jika berupa nomor telepon, dinormalisasi ke 62...
 */
export async function findMemberForCashier(
  query: string
): Promise<{ success: boolean; member?: CashierMemberProfile; error?: string }> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "CASHIER")) {
    return { success: false, error: "Akses ditolak: hanya staf yang diizinkan" };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, error: "Harap masukkan kode member atau nomor HP" };
  }

  const upperCode = trimmed.toUpperCase();
  const digitsOnly = trimmed.replace(/\D/g, "");

  // Cari berdasarkan kode atau nomor HP
  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { code: upperCode },
        ...(digitsOnly.length >= 8
          ? [
              { phone: normalizePhone(trimmed) },
              { phone: digitsOnly },
            ]
          : []),
      ],
    },
  });

  if (!member) {
    return {
      success: false,
      error: `Member dengan identitas "${trimmed}" tidak ditemukan`,
    };
  }

  if (!member.isActive) {
    return {
      success: false,
      error: `Member ${member.name} (${member.code}) berstatus NONAKTIF. Transaksi tidak dapat diproses.`,
    };
  }

  const [balance, levelInfo] = await Promise.all([
    getMemberBalance(member.id),
    getMemberLevelInfo(member.id),
  ]);

  return {
    success: true,
    member: {
      id: member.id,
      code: member.code,
      name: member.name,
      phone: member.phone,
      isActive: member.isActive,
      balance,
      levelInfo,
    },
  };
}

/**
 * Preview perolehan poin dari nominal belanja secara server-side
 */
export async function previewEarnedPoints(amount: number): Promise<number> {
  return await calcEarnedPoints(amount);
}

export interface SubmitTransactionInput {
  memberId: string;
  amount: number;
  shift: Shift;
  idempotencyKey: string;
}

/**
 * Simpan transaksi kasir
 * - Menggunakan createTransaction di lib/points.ts (prisma.$transaction)
 * - Cek role server-side (ADMIN atau CASHIER)
 */
export async function submitCashierTransaction(input: SubmitTransactionInput) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || (user.role !== "ADMIN" && user.role !== "CASHIER")) {
    throw new Error("Akses ditolak: Anda harus login sebagai Kasir atau Admin");
  }

  const result = await createTransaction({
    memberId: input.memberId,
    amount: input.amount,
    cashierId: user.id,
    shift: input.shift,
    idempotencyKey: input.idempotencyKey,
  });

  // Revalidate rute kasir & admin
  revalidatePath("/kasir");
  revalidatePath("/admin/riwayat");
  revalidatePath("/admin");

  return {
    success: true,
    transactionId: result.transaction.id,
    pointsEarned: result.pointsEarned,
  };
}
