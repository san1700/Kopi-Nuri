"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  executeRedeemReward,
  executeValidateVoucher,
  getVoucherDetailByCode,
  generateVoucherQrDataUrl,
} from "@/lib/redemption";

export { generateVoucherQrDataUrl };

export interface RedeemRewardParams {
  memberId: string;
  rewardId: string;
}

/**
 * Penukaran Reward di Kasir (Server Action)
 * Dilindungi autentikasi session Kasir/Admin
 */
export async function redeemReward(params: RedeemRewardParams) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || (user.role !== "ADMIN" && user.role !== "CASHIER")) {
    throw new Error("Akses ditolak: Anda harus login sebagai Kasir atau Admin");
  }

  const result = await executeRedeemReward({
    memberId: params.memberId,
    rewardId: params.rewardId,
    actorId: user.id,
  });

  revalidatePath("/kasir/tukar");
  revalidatePath("/kasir/voucher");
  revalidatePath("/admin/riwayat");
  revalidatePath("/admin/reward");

  return {
    success: true,
    voucherCode: result.redemption.voucherCode,
    rewardName: result.redemption.reward.name,
    pointsSpent: result.redemption.pointsSpent,
    newBalance: result.newBalance,
    qrDataUrl: result.qrDataUrl,
    redemptionId: result.redemption.id,
    createdAt: result.redemption.createdAt,
  };
}

/**
 * Cari Voucher Berdasarkan Kode untuk Validasi Kasir
 */
export async function getVoucherDetail(voucherCode: string) {
  return await getVoucherDetailByCode(voucherCode);
}

/**
 * Validasi dan Tandai Voucher Sudah Dipakai (Kasir)
 */
export async function validateAndUseVoucher(voucherCode: string) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || (user.role !== "ADMIN" && user.role !== "CASHIER")) {
    throw new Error("Akses ditolak: Anda harus login sebagai Kasir atau Admin");
  }

  const result = await executeValidateVoucher({
    voucherCode,
    actorId: user.id,
  });

  revalidatePath("/kasir/voucher");
  revalidatePath("/admin/riwayat");

  return {
    success: true,
    voucher: result.voucher,
  };
}
