import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { createHmac, randomInt } from "crypto";
import prisma from "@/lib/prisma";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginAttempts,
} from "@/lib/auth-rate-limit";

const MEMBER_SESSION_COOKIE = "kopi_nuri_member_session";
const SECRET_STRING =
  process.env.AUTH_SECRET ?? "dev-secret-ganti-di-production-min-32-char";
const SECRET = new TextEncoder().encode(SECRET_STRING);
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

const OTP_TTL_MS = 5 * 60 * 1000; // 5 menit
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 detik
const OTP_MAX_ATTEMPTS = 5;

export interface MemberSession {
  memberId: string;
  memberCode: string;
}

/**
 * Buat JWT session untuk member dan simpan sebagai cookie httpOnly (stateless, tanpa memori)
 */
export async function setMemberSession(session: MemberSession): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/member",
  });
}

/**
 * Baca session member dari cookie
 */
export async function getMemberSession(): Promise<MemberSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      memberId: payload.memberId as string,
      memberCode: payload.memberCode as string,
    };
  } catch {
    return null;
  }
}

/**
 * Hapus session member (logout)
 */
export async function clearMemberSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/member",
  });
}

// --- PIN Hashing ---
export async function hashPin(pin: string): Promise<string> {
  return await hash(pin, 10);
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return await compare(pin, pinHash);
}

// --- Rate limit login member (berbasis DB) ---
export async function checkRateLimit(
  phone: string
): Promise<{ allowed: boolean; remainingMs?: number }> {
  return checkLoginRateLimit(`member:${phone}`);
}

export async function recordFailedAttempt(phone: string): Promise<void> {
  return recordLoginFailure(`member:${phone}`);
}

export async function clearLoginAttempts(phone: string): Promise<void> {
  return resetLoginAttempts(`member:${phone}`);
}

// --- OTP berbasis Database (stateless untuk serverless) ---
function hashOtpCode(phone: string, otp: string): string {
  return createHmac("sha256", SECRET_STRING)
    .update(`${phone}:${otp.trim()}`)
    .digest("hex");
}

export type GenerateOtpResult =
  | { ok: true; otp: string }
  | { ok: false; error: string; retryAfterSec: number };

/**
 * Buat kode OTP 6 digit, simpan hash SHA-256 ke tabel OtpCode (berlaku 5 menit).
 * Dibatasi cooldown 60 detik per nomor HP.
 */
export async function generateOtp(phone: string): Promise<GenerateOtpResult> {
  const now = new Date();

  const latest = await prisma.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest) {
    const elapsedMs = now.getTime() - latest.createdAt.getTime();
    if (elapsedMs < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000
      );
      return {
        ok: false,
        retryAfterSec,
        error: `Tunggu ${retryAfterSec} detik sebelum meminta kode OTP baru.`,
      };
    }
  }

  const otp = String(randomInt(100000, 1000000));
  const codeHash = hashOtpCode(phone, otp);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await prisma.otpCode.create({
    data: {
      phone,
      codeHash,
      expiresAt,
      attempts: 0,
    },
  });

  return { ok: true, otp };
}

/**
 * Verifikasi OTP dari tabel OtpCode:
 * - Hanya berlaku 5 menit
 * - Sekali pakai (usedAt)
 * - Maksimal 5 kali salah
 */
export async function verifyOtp(
  phone: string,
  inputOtp: string
): Promise<{ valid: boolean; error?: string }> {
  const now = new Date();
  const record = await prisma.otpCode.findFirst({
    where: { phone, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return {
      valid: false,
      error: "Kode OTP tidak ditemukan atau sudah digunakan. Silakan minta kode baru.",
    };
  }

  if (record.expiresAt <= now) {
    return {
      valid: false,
      error: "Kode OTP sudah kadaluarsa. Silakan minta kode baru.",
    };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      valid: false,
      error: "Terlalu banyak percobaan OTP salah. Silakan minta kode baru.",
    };
  }

  const inputHash = hashOtpCode(phone, inputOtp);
  if (inputHash !== record.codeHash) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return {
      valid: false,
      error: "Kode OTP tidak sesuai.",
    };
  }

  // Tandai usedAt secara atomik agar tidak bisa dipakai dua kali
  const updated = await prisma.otpCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: now },
  });

  if (updated.count !== 1) {
    return {
      valid: false,
      error: "Kode OTP sudah digunakan.",
    };
  }

  return { valid: true };
}
