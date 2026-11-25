import prisma from "@/lib/prisma";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { Shift, Transaction } from "@prisma/client";

export type MemberLevel = "Silver" | "Gold" | "Platinum";

export interface LevelInfo {
  level: MemberLevel;
  totalEarned: number;
  nextLevel: MemberLevel | null;
  pointsToNextLevel: number;
  progressPercent: number;
}

/**
 * Hitung saldo poin member = SUM(points) dari PointLedger
 * Tidak disimpan sebagai kolom!
 */
export async function getMemberBalance(memberId: string): Promise<number> {
  const result = await prisma.pointLedger.aggregate({
    where: { memberId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/**
 * Alias helper untuk getMemberTotalEarned
 */
export const getTotalEarned = getMemberTotalEarned;

/**
 * Hitung total poin yang pernah diperoleh (EARN + BONUS + ADJUST positif)
 * Digunakan untuk menentukan level. Level tidak turun setelah tukar poin.
 */
export async function getMemberTotalEarned(memberId: string): Promise<number> {
  const result = await prisma.pointLedger.aggregate({
    where: {
      memberId,
      OR: [
        { type: "EARN" },
        { type: "BONUS" },
        { type: "ADJUST", points: { gt: 0 } },
      ],
    },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/**
 * Tentukan level member berdasarkan total poin yang pernah diperoleh
 */
export async function getMemberLevel(memberId: string): Promise<MemberLevel> {
  const totalEarned = await getMemberTotalEarned(memberId);
  return getLevelFromTotal(totalEarned);
}

/**
 * Tentukan level dari total poin (helper, baca Setting)
 */
export async function getLevelFromTotal(
  totalEarned: number
): Promise<MemberLevel> {
  const platinumMin = await getSettingNumber(SETTING_KEYS.LEVEL_PLATINUM_MIN);
  const goldMin = await getSettingNumber(SETTING_KEYS.LEVEL_GOLD_MIN);

  if (totalEarned >= platinumMin) return "Platinum";
  if (totalEarned >= goldMin) return "Gold";
  return "Silver";
}

/**
 * Dapatkan informasi lengkap level dan progress menuju level berikutnya
 */
export async function getMemberLevelInfo(memberId: string): Promise<LevelInfo> {
  const totalEarned = await getMemberTotalEarned(memberId);
  const goldMin = await getSettingNumber(SETTING_KEYS.LEVEL_GOLD_MIN);
  const platinumMin = await getSettingNumber(SETTING_KEYS.LEVEL_PLATINUM_MIN);

  if (totalEarned >= platinumMin) {
    return {
      level: "Platinum",
      totalEarned,
      nextLevel: null,
      pointsToNextLevel: 0,
      progressPercent: 100,
    };
  }

  if (totalEarned >= goldMin) {
    const range = platinumMin - goldMin;
    const progress = totalEarned - goldMin;
    const progressPercent = Math.min(100, Math.floor((progress / range) * 100));
    return {
      level: "Gold",
      totalEarned,
      nextLevel: "Platinum",
      pointsToNextLevel: platinumMin - totalEarned,
      progressPercent,
    };
  }

  const range = goldMin;
  const progressPercent = Math.min(100, Math.floor((totalEarned / range) * 100));
  return {
    level: "Silver",
    totalEarned,
    nextLevel: "Gold",
    pointsToNextLevel: goldMin - totalEarned,
    progressPercent,
  };
}

/**
 * Hitung poin yang didapat dari jumlah belanja (berdasarkan Setting)
 * Rumus: floor(amount / earn_rupiah_unit) * earn_points_per_unit
 * Pembulatan ke bawah. Sisa di bawah earn_rupiah_unit hangus.
 */
export async function calcEarnedPoints(amount: number): Promise<number> {
  if (amount <= 0) return 0;
  const unit = await getSettingNumber(SETTING_KEYS.EARN_RUPIAH_UNIT);
  const pointsPerUnit = await getSettingNumber(
    SETTING_KEYS.EARN_POINTS_PER_UNIT
  );
  return Math.floor(amount / unit) * pointsPerUnit;
}

export interface CreateTransactionParams {
  memberId: string;
  amount: number;
  cashierId: string;
  shift: Shift;
  idempotencyKey?: string | null;
}

/**
 * Buat transaksi kasir dan ledger poin dalam satu prisma.$transaction
 * - Validasi amount > 0
 * - Validasi member ada dan aktif
 * - Simpan Transaction
 * - Simpan PointLedger tipe EARN jika poin > 0
 * - Update Member.lastVisitAt
 * - Aman dari transaksi ganda via idempotencyKey
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<{ transaction: Transaction; pointsEarned: number }> {
  const { memberId, amount, cashierId, shift, idempotencyKey } = params;

  if (amount <= 0) {
    throw new Error("Nominal transaksi harus lebih dari Rp 0");
  }

  const pointsEarned = await calcEarnedPoints(amount);

  return await prisma.$transaction(async (tx) => {
    // 1. Cek idempotency key
    if (idempotencyKey) {
      const existing = await tx.transaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { transaction: existing, pointsEarned: existing.pointsEarned };
      }
    }

    // 2. Cek member
    const member = await tx.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new Error("Member tidak ditemukan");
    }

    if (!member.isActive) {
      throw new Error("Member sedang dinonaktifkan");
    }

    // 3. Cek kasir & ambil branchId
    const cashier = await tx.user.findUnique({
      where: { id: cashierId },
    });

    if (!cashier) {
      throw new Error("Kasir tidak valid");
    }

    const now = new Date();

    // 4. Buat Transaction
    const transaction = await tx.transaction.create({
      data: {
        memberId,
        cashierId,
        branchId: cashier.branchId,
        shift,
        amount,
        pointsEarned,
        idempotencyKey: idempotencyKey || null,
        createdAt: now,
      },
    });

    // 5. Buat PointLedger bertipe EARN jika poin diperoleh > 0
    if (pointsEarned > 0) {
      await tx.pointLedger.create({
        data: {
          memberId,
          points: pointsEarned,
          type: "EARN",
          note: `Belanja Rp ${amount.toLocaleString("id-ID")}`,
          transactionId: transaction.id,
          createdById: cashierId,
          createdAt: now,
        },
      });
    }

    // 6. Update lastVisitAt pada Member
    await tx.member.update({
      where: { id: memberId },
      data: { lastVisitAt: now },
    });

    return { transaction, pointsEarned };
  });
}
