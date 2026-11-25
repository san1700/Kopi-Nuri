import prisma from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 menit

/**
 * Periksa apakah key login (mis. "staff:admin" atau "member:62812...") sedang terkunci
 */
export async function checkLoginRateLimit(
  key: string
): Promise<{ allowed: boolean; remainingMs?: number }> {
  const now = new Date();
  const record = await prisma.loginAttempt.findUnique({ where: { key } });

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil) {
    if (record.lockedUntil > now) {
      return {
        allowed: false,
        remainingMs: record.lockedUntil.getTime() - now.getTime(),
      };
    }

    // Lockout sudah berakhir -> reset hitungan
    await prisma.loginAttempt.update({
      where: { key },
      data: { count: 0, lockedUntil: null },
    });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
    await prisma.loginAttempt.update({
      where: { key },
      data: { lockedUntil },
    });
    return { allowed: false, remainingMs: LOCKOUT_MS };
  }

  return { allowed: true };
}

/**
 * Catat kegagalan login di database; kunci 15 menit jika mencapai 5 kali gagal
 */
export async function recordLoginFailure(key: string): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.loginAttempt.findUnique({ where: { key } });

    if (!existing) {
      await tx.loginAttempt.create({
        data: { key, count: 1, lockedUntil: null },
      });
      return;
    }

    // Jika sebelumnya terkunci tapi masa kunci sudah habis, mulai hitung ulang dari 1
    if (existing.lockedUntil && existing.lockedUntil <= now) {
      await tx.loginAttempt.update({
        where: { key },
        data: { count: 1, lockedUntil: null },
      });
      return;
    }

    const nextCount = existing.count + 1;
    const lockedUntil =
      nextCount >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MS) : null;

    await tx.loginAttempt.update({
      where: { key },
      data: { count: nextCount, lockedUntil },
    });
  });
}

/**
 * Reset percobaan login saat login berhasil
 */
export async function resetLoginAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

