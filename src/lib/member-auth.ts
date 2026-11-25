import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

const MEMBER_SESSION_COOKIE = "kopi_nuri_member_session";
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-ganti-di-production-min-32-char"
);
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

export interface MemberSession {
  memberId: string;
  memberCode: string;
}

/**
 * Buat JWT session untuk member dan simpan sebagai cookie httpOnly
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

// --- Simpan PIN yang di-hash ---
export async function hashPin(pin: string): Promise<string> {
  return await hash(pin, 10);
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return await compare(pin, pinHash);
}

// Rate limiting: simpan di memori (dalam production pakai Redis)
// Map: phone -> { count, lastAttempt }
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 menit

export function checkRateLimit(phone: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const record = loginAttempts.get(phone);

  if (!record) return { allowed: true };

  // Reset jika lockout sudah expired
  if (now - record.lastAttempt > LOCKOUT_MS) {
    loginAttempts.delete(phone);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingMs = LOCKOUT_MS - (now - record.lastAttempt);
    return { allowed: false, remainingMs };
  }

  return { allowed: true };
}

export function recordFailedAttempt(phone: string): void {
  const now = Date.now();
  const record = loginAttempts.get(phone);

  if (!record || now - record.lastAttempt > LOCKOUT_MS) {
    loginAttempts.set(phone, { count: 1, lastAttempt: now });
  } else {
    loginAttempts.set(phone, { count: record.count + 1, lastAttempt: now });
  }
}

export function clearLoginAttempts(phone: string): void {
  loginAttempts.delete(phone);
}

// --- OTP simulasi (mudah diganti WhatsApp nanti) ---
// Simpan OTP: phone -> { otp, expiresAt }
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export function generateOtp(phone: string): string {
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digit
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 menit
  });

  // Mode simulasi: log ke console (akan diganti WhatsApp)
  console.log(`[OTP SIMULASI] Phone: ${phone} → Kode: ${otp}`);

  return otp;
}

export function verifyOtp(phone: string, inputOtp: string): boolean {
  const record = otpStore.get(phone);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  if (record.otp !== inputOtp.trim()) return false;
  otpStore.delete(phone); // Single-use
  return true;
}

// Ambil OTP untuk ditampilkan di UI (mode simulasi)
export function getSimulatedOtp(phone: string): string | null {
  const record = otpStore.get(phone);
  if (!record || Date.now() > record.expiresAt) return null;
  return record.otp;
}

