import prisma from "@/lib/prisma";

export type SettingsMap = Record<string, string>;

/**
 * Baca semua Setting dari database
 */
export async function getAllSettings(): Promise<SettingsMap> {
  const rows = await prisma.setting.findMany();
  const map: SettingsMap = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

/**
 * Baca satu Setting berdasarkan key
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/**
 * Baca satu Setting berdasarkan key, kembalikan sebagai number
 */
export async function getSettingNumber(key: string): Promise<number> {
  const val = await getSetting(key);
  if (val === null) throw new Error(`Setting "${key}" tidak ditemukan`);
  return Number(val);
}

/**
 * Key-key Setting yang digunakan sistem
 */
export const SETTING_KEYS = {
  EARN_RUPIAH_UNIT: "earn_rupiah_unit",
  EARN_POINTS_PER_UNIT: "earn_points_per_unit",
  SIGNUP_BONUS: "signup_bonus",
  REDEEM_MIN_POINTS: "redeem_min_points",
  LEVEL_SILVER_MIN: "level_silver_min",
  LEVEL_GOLD_MIN: "level_gold_min",
  LEVEL_PLATINUM_MIN: "level_platinum_min",
  WA_INACTIVE_DAYS: "wa_inactive_days",
  WA_COOLDOWN_DAYS: "wa_cooldown_days",
} as const;

