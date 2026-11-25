"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllSettings, SETTING_KEYS } from "@/lib/settings";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Akses ditolak: hanya ADMIN yang diizinkan");
  }
  return session.user;
}

const SettingsSchema = z
  .object({
    earn_rupiah_unit: z.coerce.number().int().min(1000, "Minimal Rp 1.000 per unit"),
    earn_points_per_unit: z.coerce.number().int().min(1, "Minimal 1 poin per unit"),
    signup_bonus: z.coerce.number().int().min(0, "Bonus daftar tidak boleh negatif"),
    redeem_min_points: z.coerce.number().int().min(1, "Minimal tukar minimal 1 poin"),
    level_silver_min: z.coerce.number().int().min(0, "Ambang Silver minimal 0"),
    level_gold_min: z.coerce.number().int().min(1, "Ambang Gold minimal 1"),
    level_platinum_min: z.coerce.number().int().min(2, "Ambang Platinum minimal 2"),
    wa_inactive_days: z.coerce.number().int().min(1, "Hari tidak aktif minimal 1"),
    wa_cooldown_days: z.coerce.number().int().min(1, "Cooldown minimal 1 hari"),
  })
  .refine((d) => d.level_gold_min > d.level_silver_min, {
    message: "Ambang Gold harus lebih besar dari Silver",
    path: ["level_gold_min"],
  })
  .refine((d) => d.level_platinum_min > d.level_gold_min, {
    message: "Ambang Platinum harus lebih besar dari Gold",
    path: ["level_platinum_min"],
  });

const CreateCashierSchema = z.object({
  name: z.string().trim().min(2, "Nama kasir minimal 2 karakter"),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username hanya boleh huruf, angka, titik, atau garis bawah"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const ResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export async function getSettingsAndCashiers() {
  await requireAdmin();

  const [settingsMap, users] = await Promise.all([
    getAllSettings(),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        branch: { select: { name: true } },
      },
    }),
  ]);

  return {
    settings: {
      earn_rupiah_unit: settingsMap[SETTING_KEYS.EARN_RUPIAH_UNIT] ?? "10000",
      earn_points_per_unit: settingsMap[SETTING_KEYS.EARN_POINTS_PER_UNIT] ?? "5",
      signup_bonus: settingsMap[SETTING_KEYS.SIGNUP_BONUS] ?? "10",
      redeem_min_points: settingsMap[SETTING_KEYS.REDEEM_MIN_POINTS] ?? "100",
      level_silver_min: settingsMap[SETTING_KEYS.LEVEL_SILVER_MIN] ?? "0",
      level_gold_min: settingsMap[SETTING_KEYS.LEVEL_GOLD_MIN] ?? "500",
      level_platinum_min: settingsMap[SETTING_KEYS.LEVEL_PLATINUM_MIN] ?? "1500",
      wa_inactive_days: settingsMap[SETTING_KEYS.WA_INACTIVE_DAYS] ?? "14",
      wa_cooldown_days: settingsMap[SETTING_KEYS.WA_COOLDOWN_DAYS] ?? "30",
    },
    users,
  };
}

export async function updateSettings(raw: Record<string, string | number>) {
  await requireAdmin();

  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const entries = Object.entries(parsed.data);
  await prisma.$transaction(
    entries.map(([key, val]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(val) },
        create: { key, value: String(val) },
      })
    )
  );

  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin");
  revalidatePath("/kasir");
  revalidatePath("/member");

  return { success: true };
}

export async function createCashier(formData: FormData) {
  const adminUser = await requireAdmin();

  const parsed = CreateCashierSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const username = parsed.data.username.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return {
      success: false,
      error: `Username "${username}" sudah digunakan`,
    };
  }

  const passwordHash = await hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      username,
      passwordHash,
      role: "CASHIER",
      isActive: true,
      branchId: adminUser.branchId,
    },
  });

  revalidatePath("/admin/pengaturan");
  return { success: true };
}

export async function toggleCashierStatus(userId: string) {
  const adminUser = await requireAdmin();

  if (userId === adminUser.id) {
    return { success: false, error: "Tidak dapat menonaktifkan akun sendiri" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user) {
    return { success: false, error: "User tidak ditemukan" };
  }
  if (user.role !== "CASHIER") {
    return { success: false, error: "Hanya akun kasir yang dapat diubah statusnya di sini" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/admin/pengaturan");
  return { success: true, isActive: !user.isActive };
}

export async function resetCashierPassword(formData: FormData) {
  await requireAdmin();

  const parsed = ResetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "CASHIER") {
    return { success: false, error: "User kasir tidak ditemukan" };
  }

  const passwordHash = await hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  revalidatePath("/admin/pengaturan");
  return { success: true };
}

