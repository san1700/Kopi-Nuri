"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const RewardSchema = z.object({
  name: z.string().trim().min(2, "Nama reward minimal 2 karakter"),
  description: z.string().trim().optional(),
  pointsCost: z.number().int().min(1, "Biaya poin minimal 1"),
  stock: z
    .number()
    .int()
    .min(0, "Stok tidak boleh negatif")
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
});

export type RewardFormData = z.infer<typeof RewardSchema>;

/**
 * Ambil daftar reward
 * Jika onlyActive = true (untuk kasir/portal), hanya reward aktif yang dikembalikan
 */
export async function getRewardsList(onlyActive = false) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "CASHIER")) {
    throw new Error("Akses ditolak: hanya staf yang diizinkan");
  }

  const where = onlyActive ? { isActive: true } : {};

  const rewards = await prisma.reward.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { pointsCost: "asc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  });

  return rewards.map((r) => ({
    ...r,
    redemptionCount: r._count.redemptions,
  }));
}

/**
 * Buat Reward Baru (Hanya ADMIN)
 */
export async function createReward(data: RewardFormData) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang dapat mengelola reward");
  }

  const validated = RewardSchema.parse(data);

  const reward = await prisma.reward.create({
    data: {
      name: validated.name,
      description: validated.description || null,
      pointsCost: validated.pointsCost,
      stock: validated.stock ?? null,
      isActive: validated.isActive,
    },
  });

  revalidatePath("/admin/reward");
  revalidatePath("/kasir/tukar");
  return { success: true, reward };
}

/**
 * Update Reward (Hanya ADMIN)
 */
export async function updateReward(id: string, data: RewardFormData) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang dapat mengelola reward");
  }

  const validated = RewardSchema.parse(data);

  const updated = await prisma.reward.update({
    where: { id },
    data: {
      name: validated.name,
      description: validated.description || null,
      pointsCost: validated.pointsCost,
      stock: validated.stock ?? null,
      isActive: validated.isActive,
    },
  });

  revalidatePath("/admin/reward");
  revalidatePath("/kasir/tukar");
  return { success: true, reward: updated };
}

/**
 * Toggle Status Aktif / Nonaktif Reward (Hanya ADMIN)
 */
export async function toggleRewardActive(id: string) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang dapat mengelola reward");
  }

  const reward = await prisma.reward.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!reward) throw new Error("Reward tidak ditemukan");

  const updated = await prisma.reward.update({
    where: { id },
    data: { isActive: !reward.isActive },
  });

  revalidatePath("/admin/reward");
  revalidatePath("/kasir/tukar");
  return { success: true, isActive: updated.isActive };
}

/**
 * Hapus Reward (Hanya ADMIN)
 * Jika sudah memiliki riwayat penukaran, tolak penghapusan fisik dan sarankan nonaktifkan
 */
export async function deleteReward(id: string) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang dapat mengelola reward");
  }

  const redemptionsCount = await prisma.redemption.count({
    where: { rewardId: id },
  });

  if (redemptionsCount > 0) {
    throw new Error(
      `Reward tidak dapat dihapus permanen karena sudah memiliki ${redemptionsCount} riwayat penukaran voucher. Silakan nonaktifkan reward ini.`
    );
  }

  await prisma.reward.delete({ where: { id } });

  revalidatePath("/admin/reward");
  revalidatePath("/kasir/tukar");
  return { success: true };
}

