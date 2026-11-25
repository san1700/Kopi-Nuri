"use server";

import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { getMemberBalance, getMemberLevelInfo } from "@/lib/points";
import { generateMemberQrDataUrl } from "@/lib/qr";
import { LedgerType } from "@prisma/client";
import {
  setMemberSession,
  getMemberSession,
  clearMemberSession,
  hashPin,
  verifyPin,
  checkRateLimit,
  recordFailedAttempt,
  clearLoginAttempts,
  generateOtp,
  verifyOtp,
  getSimulatedOtp,
} from "@/lib/member-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phone: z.string().trim().min(8, "Nomor HP minimal 8 digit"),
  email: z.string().trim().email("Format email tidak valid").optional().or(z.literal("")),
  pin: z.string().trim().regex(/^\d{4,6}$/, "PIN harus 4-6 digit angka"),
  waOptIn: z.boolean().default(false),
});

const LoginSchema = z.object({
  phone: z.string().trim().min(8, "Nomor HP minimal 8 digit"),
  pin: z.string().trim().regex(/^\d{4,6}$/, "PIN harus 4-6 digit"),
});

/**
 * Langkah 1 registrasi: validasi data dan kirim OTP simulasi
 */
export async function requestMemberOtp(formData: FormData) {
  const rawData = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    pin: formData.get("pin") as string,
    waOptIn: formData.get("waOptIn") === "true",
  };

  const validated = RegisterSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0].message,
    };
  }

  const phone = normalizePhone(validated.data.phone);

  // Cek apakah nomor sudah terdaftar
  const existing = await prisma.member.findUnique({ where: { phone } });
  if (existing) {
    return {
      success: false,
      error: `Nomor HP ${phone} sudah terdaftar. Silakan login.`,
    };
  }

  // Generate OTP simulasi (di production: kirim via WhatsApp)
  const otp = generateOtp(phone);

  // Mode simulasi: kembalikan OTP di response (akan dihapus saat WhatsApp aktif)
  return {
    success: true,
    phone,
    // OTP dikembalikan hanya untuk mode simulasi
    // Ganti dengan: success: true (tanpa OTP) saat WhatsApp aktif
    simulatedOtp: otp,
    message: `Kode OTP telah dikirim ke ${phone}`,
  };
}

/**
 * Langkah 2 registrasi: verifikasi OTP dan buat akun member
 */
export async function verifyOtpAndRegister(formData: FormData) {
  const phone = formData.get("phone") as string;
  const otp = formData.get("otp") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const pin = formData.get("pin") as string;
  const waOptIn = formData.get("waOptIn") === "true";

  if (!phone || !otp || !name || !pin) {
    return { success: false, error: "Data tidak lengkap" };
  }

  // Verifikasi OTP
  const otpValid = verifyOtp(phone, otp);
  if (!otpValid) {
    return {
      success: false,
      error: "Kode OTP tidak valid atau sudah kadaluarsa. Silakan minta kode baru.",
    };
  }

  // Cek sekali lagi apakah nomor sudah terdaftar (race condition)
  const existing = await prisma.member.findUnique({ where: { phone } });
  if (existing) {
    return {
      success: false,
      error: `Nomor HP ${phone} sudah terdaftar.`,
    };
  }

  // Generate kode member berikutnya
  const signupBonus = await getSettingNumber(SETTING_KEYS.SIGNUP_BONUS).catch(() => 10);

  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    const members = await prisma.member.findMany({
      where: { code: { startsWith: "MBR-" } },
      select: { code: true },
    });
    let maxNum = 0;
    for (const m of members) {
      const match = /^MBR-(\d+)$/.exec(m.code);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const code = `MBR-${String(maxNum + 1).padStart(6, "0")}`;

    try {
      const pinHash = await hashPin(pin);
      const now = new Date();

      const member = await prisma.$transaction(async (tx) => {
        const m = await tx.member.create({
          data: {
            code,
            name: name.trim(),
            phone,
            email: email?.trim() || null,
            pinHash,
            source: "SELF",
            isActive: true,
            waOptIn,
            waOptInAt: waOptIn ? now : null,
          },
        });

        // Bonus daftar
        if (signupBonus > 0) {
          await tx.pointLedger.create({
            data: {
              memberId: m.id,
              points: signupBonus,
              type: "BONUS",
              note: `Bonus pendaftaran mandiri (${signupBonus} poin)`,
            },
          });
        }

        return m;
      });

      // Set session cookie
      await setMemberSession({
        memberId: member.id,
        memberCode: member.code,
      });

      return {
        success: true,
        member: {
          id: member.id,
          code: member.code,
          name: member.name,
        },
        bonusPoints: signupBonus,
      };
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error?.code === "P2002" && attempts < 5) continue;
      throw err;
    }
  }

  return { success: false, error: "Gagal membuat akun. Silakan coba lagi." };
}

/**
 * Login member dengan HP + PIN
 */
export async function loginMember(formData: FormData) {
  const rawPhone = formData.get("phone") as string;
  const pin = formData.get("pin") as string;

  if (!rawPhone || !pin) {
    return { success: false, error: "Nomor HP dan PIN wajib diisi" };
  }

  const phone = normalizePhone(rawPhone);

  // Rate limiting
  const rateCheck = checkRateLimit(phone);
  if (!rateCheck.allowed) {
    const remainingMin = Math.ceil((rateCheck.remainingMs ?? 0) / 60000);
    return {
      success: false,
      error: `Terlalu banyak percobaan. Coba lagi dalam ${remainingMin} menit.`,
    };
  }

  const member = await prisma.member.findUnique({ where: { phone } });

  if (!member || !member.isActive) {
    recordFailedAttempt(phone);
    return {
      success: false,
      error: "Nomor HP tidak terdaftar atau akun dinonaktifkan.",
    };
  }

  if (!member.pinHash) {
    return { success: false, error: "Akun ini belum memiliki PIN. Hubungi kasir." };
  }

  const pinValid = await verifyPin(pin, member.pinHash);
  if (!pinValid) {
    recordFailedAttempt(phone);
    return { success: false, error: "PIN salah. Periksa kembali PIN Anda." };
  }

  // Login berhasil
  clearLoginAttempts(phone);
  await setMemberSession({
    memberId: member.id,
    memberCode: member.code,
  });

  return { success: true, member: { id: member.id, code: member.code, name: member.name } };
}

/**
 * Logout member
 */
export async function logoutMember() {
  await clearMemberSession();
}

/**
 * Ambil data beranda member (berdasarkan session)
 */
export async function getMemberHome() {
  const session = await getMemberSession();
  if (!session) return { success: false, error: "Tidak terautentikasi", data: null };

  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      isActive: true,
      waOptIn: true,
      source: true,
      createdAt: true,
    },
  });

  if (!member || !member.isActive) {
    await clearMemberSession();
    return { success: false, error: "Akun tidak ditemukan atau dinonaktifkan", data: null };
  }

  const [balance, levelInfo, qrDataUrl] = await Promise.all([
    getMemberBalance(member.id),
    getMemberLevelInfo(member.id),
    generateMemberQrDataUrl(member.code),
  ]);

  // 3 aktivitas terakhir
  const recentLedger = await prisma.pointLedger.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      type: true,
      points: true,
      note: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    data: {
      member: {
        id: member.id,
        memberCode: member.code,
        name: member.name,
        phone: member.phone,
        email: member.email,
        isActive: member.isActive,
        waOptIn: member.waOptIn,
        source: member.source,
        createdAt: member.createdAt,
      },
      balance,
      levelInfo,
      qrDataUrl,
      recentLedger,
    },
  };
}

/**
 * Ambil riwayat poin member
 */
export async function getMemberLedger(
  params: { page?: number; pageSize?: number; limit?: number; type?: string } = {}
) {
  const session = await getMemberSession();
  if (!session) return { success: false, error: "Tidak terautentikasi", data: null };

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, params.pageSize ?? params.limit ?? 20);
  const skip = (page - 1) * pageSize;

  // Validate type against LedgerType enum
  const validTypes: LedgerType[] = ["EARN", "BONUS", "REDEEM", "ADJUST"];
  const ledgerType =
    params.type && validTypes.includes(params.type as LedgerType)
      ? (params.type as LedgerType)
      : undefined;

  const whereClause = {
    memberId: session.memberId,
    ...(ledgerType ? { type: ledgerType } : {}),
  };

  const [totalCount, entries] = await Promise.all([
    prisma.pointLedger.count({ where: whereClause }),
    prisma.pointLedger.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        points: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    success: true,
    data: {
      entries,
      totalCount,
      hasMore: skip + entries.length < totalCount,
      currentPage: page,
    },
  };
}

/**
 * Ambil voucher member
 */
export async function getMemberVouchers() {
  const session = await getMemberSession();
  if (!session) return { success: false, data: null };

  const vouchers = await prisma.redemption.findMany({
    where: { memberId: session.memberId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      voucherCode: true,
      usedAt: true,
      createdAt: true,
      reward: { select: { name: true, pointsCost: true } },
    },
  });

  return {
    success: true,
    data: vouchers.map((v) => ({
      id: v.id,
      voucherCode: v.voucherCode,
      usedAt: v.usedAt,
      createdAt: v.createdAt,
      reward: { name: v.reward.name, pointCost: v.reward.pointsCost },
    })),
  };
}

/**
 * Ambil katalog reward aktif dengan info kelayakan
 */
export async function getMemberRewardCatalog() {
  const session = await getMemberSession();
  if (!session) return { success: false, data: null };

  const [rewards, balance, redeemMinPoints] = await Promise.all([
    prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        pointsCost: true,
        stock: true,
      },
    }),
    getMemberBalance(session.memberId),
    getSettingNumber(SETTING_KEYS.REDEEM_MIN_POINTS).catch(() => 100),
  ]);

  return {
    success: true,
    data: {
      rewards: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        pointCost: r.pointsCost,
        stock: r.stock,
      })),
      balance,
      redeemMinPoints,
    },
  };
}

/**
 * Ambil saldo terbaru untuk polling
 */
export async function pollMemberBalance() {
  const session = await getMemberSession();
  if (!session) return { success: false, balance: 0 };

  const balance = await getMemberBalance(session.memberId);
  return { success: true, balance, memberId: session.memberId };
}

/**
 * Update profil member (nama, email, waOptIn)
 */
export async function updateMemberProfile(formData: FormData) {
  const session = await getMemberSession();
  if (!session) return { success: false, error: "Tidak terautentikasi" };

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const waOptIn = formData.get("waOptIn") === "true";

  if (!name || name.length < 2) {
    return { success: false, error: "Nama minimal 2 karakter" };
  }

  const current = await prisma.member.findUnique({
    where: { id: session.memberId },
    select: { waOptIn: true },
  });

  const now = new Date();
  await prisma.member.update({
    where: { id: session.memberId },
    data: {
      name,
      email: email || null,
      waOptIn,
      waOptInAt: waOptIn && !current?.waOptIn ? now : undefined,
    },
  });

  revalidatePath("/member");
  return { success: true };
}

/**
 * Ganti PIN member
 */
export async function changeMemberPin(formData: FormData) {
  const session = await getMemberSession();
  if (!session) return { success: false, error: "Tidak terautentikasi" };

  const currentPin = formData.get("currentPin") as string;
  const newPin = formData.get("newPin") as string;

  if (!currentPin || !newPin) {
    return { success: false, error: "PIN lama dan baru wajib diisi" };
  }

  if (!/^\d{4,6}$/.test(newPin)) {
    return { success: false, error: "PIN baru harus 4-6 digit angka" };
  }

  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
    select: { pinHash: true },
  });

  if (!member?.pinHash) {
    return { success: false, error: "Akun tidak memiliki PIN" };
  }

  const isCurrentValid = await verifyPin(currentPin, member.pinHash);
  if (!isCurrentValid) {
    return { success: false, error: "PIN lama tidak sesuai" };
  }

  const newPinHash = await hashPin(newPin);
  await prisma.member.update({
    where: { id: session.memberId },
    data: { pinHash: newPinHash },
  });

  return { success: true };
}
