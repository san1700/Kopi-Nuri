import prisma from "@/lib/prisma";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import QRCode from "qrcode";

// Karakter tidak ambigu untuk voucher code (tanpa O, 0, I, 1)
export const UNAMBIGUOUS_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generate voucher code: KN-XXXXXX (6 karakter unik dan tidak ambigu)
 */
export function generateVoucherCode(): string {
  let result = "KN-";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * UNAMBIGUOUS_CHARS.length);
    result += UNAMBIGUOUS_CHARS[randomIndex];
  }
  return result;
}

/**
 * Generate QR code kecil untuk voucher
 */
export async function generateVoucherQrDataUrl(code: string): Promise<string> {
  return await QRCode.toDataURL(code.trim().toUpperCase(), {
    errorCorrectionLevel: "M",
    margin: 3,
    width: 200,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

export interface ExecuteRedeemParams {
  memberId: string;
  rewardId: string;
  actorId?: string;
}

/**
 * Logika Inti Penukaran Reward (Transactional & Atomic)
 * Memenuhi seluruh aturan bisnis Tahap 3:
 * 1. Cek member aktif
 * 2. Cek saldo ulang di dalam transaksi
 * 3. Validasi minimal saldo penukaran (Setting: redeem_min_points)
 * 4. Cek reward aktif & cukup poin
 * 5. Cek & kurangi stok (jika ada batas stok)
 * 6. Generate voucherCode KN-XXXXXX tidak ambigu
 * 7. Buat Redemption (UNUSED)
 * 8. Buat PointLedger bertipe REDEEM bernilai negatif (-pointsCost)
 * 9. Validasi akhir: pastikan saldo TIDAK BOLEH menjadi negatif!
 */
export async function executeRedeemReward(params: ExecuteRedeemParams) {
  const { memberId, rewardId, actorId } = params;

  const redeemMinPoints = await getSettingNumber(SETTING_KEYS.REDEEM_MIN_POINTS).catch(() => 100);

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Cek Member
      const member = await tx.member.findUnique({
        where: { id: memberId },
        select: { id: true, name: true, code: true, isActive: true },
      });

      if (!member) throw new Error("Member tidak ditemukan");
      if (!member.isActive) throw new Error("Member sedang nonaktif");

      // 2. Cek Saldo Ulang di dalam transaksi
      const balanceAgg = await tx.pointLedger.aggregate({
        where: { memberId },
        _sum: { points: true },
      });
      const currentBalance = balanceAgg._sum.points ?? 0;

      // 3. Validasi batas minimal saldo untuk penukaran (Setting redeem_min_points)
      if (currentBalance < redeemMinPoints) {
        throw new Error(
          `Minimal saldo untuk penukaran adalah ${redeemMinPoints} poin (saldo member saat ini: ${currentBalance} poin)`
        );
      }

      // 4. Cek Reward
      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward) throw new Error("Reward tidak ditemukan");
      if (!reward.isActive) throw new Error("Reward ini sedang tidak aktif");

      // Validasi kecukupan poin
      if (currentBalance < reward.pointsCost) {
        const shortage = reward.pointsCost - currentBalance;
        throw new Error(
          `Saldo poin tidak mencukupi untuk reward ini (kurang ${shortage} poin)`
        );
      }

      // 5. Cek & Kurangi Stok jika ada batas stok
      if (reward.stock !== null) {
        if (reward.stock <= 0) {
          throw new Error(`Stok untuk reward "${reward.name}" telah habis`);
        }
        await tx.reward.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });
      }

      // 6. Generate Voucher Code Unik
      let voucherCode = "";
      let attempts = 0;
      while (attempts < 10) {
        attempts++;
        const candidate = generateVoucherCode();
        const existing = await tx.redemption.findUnique({
          where: { voucherCode: candidate },
        });
        if (!existing) {
          voucherCode = candidate;
          break;
        }
      }

      if (!voucherCode) {
        throw new Error("Gagal mengalokasikan kode voucher unik. Silakan coba lagi.");
      }

      const now = new Date();

      // 7. Buat Redemption
      const redemption = await tx.redemption.create({
        data: {
          memberId,
          rewardId,
          pointsSpent: reward.pointsCost,
          voucherCode,
          status: "UNUSED",
          createdAt: now,
        },
        include: {
          reward: true,
          member: true,
        },
      });

      // 8. Buat PointLedger tipe REDEEM bernilai negatif
      await tx.pointLedger.create({
        data: {
          memberId,
          points: -reward.pointsCost,
          type: "REDEEM",
          redemptionId: redemption.id,
          createdById: actorId,
          note: `Penukaran reward: ${reward.name}`,
          createdAt: now,
        },
      });

      // 9. Validasi Akhir: Pastikan saldo TIDAK PERNAH negatif
      const finalBalanceAgg = await tx.pointLedger.aggregate({
        where: { memberId },
        _sum: { points: true },
      });
      const finalBalance = finalBalanceAgg._sum.points ?? 0;

      if (finalBalance < 0) {
        throw new Error(
          `Penukaran ditolak: Saldo poin tidak boleh menjadi negatif (saldo akhir: ${finalBalance})`
        );
      }

      return {
        redemption,
        newBalance: finalBalance,
      };
    },
    {
      timeout: 10000,
    }
  );

  const qrDataUrl = await generateVoucherQrDataUrl(result.redemption.voucherCode);

  return {
    redemption: result.redemption,
    newBalance: result.newBalance,
    qrDataUrl,
  };
}

/**
 * Cari detail voucher berdasarkan kode
 */
export async function getVoucherDetailByCode(voucherCode: string) {
  const cleanCode = voucherCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: "Harap masukkan kode voucher" };
  }

  const voucher = await prisma.redemption.findUnique({
    where: { voucherCode: cleanCode },
    include: {
      member: {
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
        },
      },
      reward: {
        select: {
          id: true,
          name: true,
          description: true,
          pointsCost: true,
        },
      },
      usedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!voucher) {
    return {
      success: false,
      error: `Voucher dengan kode "${cleanCode}" tidak ditemukan`,
    };
  }

  const qrDataUrl = await generateVoucherQrDataUrl(voucher.voucherCode);

  return {
    success: true,
    voucher: {
      ...voucher,
      qrDataUrl,
    },
  };
}

export interface ExecuteValidateVoucherParams {
  voucherCode: string;
  actorId?: string;
}

/**
 * Validasi dan tandai voucher USED
 * Tolak jika sudah USED sebelumnya
 */
export async function executeValidateVoucher(params: ExecuteValidateVoucherParams) {
  const cleanCode = params.voucherCode.trim().toUpperCase();

  return await prisma.$transaction(async (tx) => {
    const voucher = await tx.redemption.findUnique({
      where: { voucherCode: cleanCode },
      include: {
        usedBy: { select: { name: true } },
        reward: { select: { name: true } },
      },
    });

    if (!voucher) {
      throw new Error(`Voucher dengan kode "${cleanCode}" tidak ditemukan`);
    }

    if (voucher.status === "USED") {
      const formattedDate = voucher.usedAt
        ? new Date(voucher.usedAt).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
          })
        : "sebelumnya";
      throw new Error(
        `Voucher "${cleanCode}" (${voucher.reward.name}) SUDAH DIGUNAKAN pada ${formattedDate} oleh ${
          voucher.usedBy?.name || "Kasir"
        }. Voucher tidak dapat dipakai lagi!`
      );
    }

    const now = new Date();
    const updated = await tx.redemption.update({
      where: { id: voucher.id },
      data: {
        status: "USED",
        usedAt: now,
        usedById: params.actorId,
      },
    });

    return {
      success: true,
      voucher: updated,
    };
  });
}

