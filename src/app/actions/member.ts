"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { getMemberBalance, getMemberLevel } from "@/lib/points";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const MemberSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phone: z.string().trim().min(8, "Nomor HP minimal 8 digit"),
  email: z.string().trim().email("Format email tidak valid").optional().or(z.literal("")),
  waOptIn: z.boolean().default(false),
});

export type MemberFormData = z.infer<typeof MemberSchema>;

/**
 * Generate next sequential member code: MBR-000001
 * Aman dari race condition dengan retry loop
 */
async function getNextMemberCode(): Promise<string> {
  const lastMember = await prisma.member.findFirst({
    where: {
      code: {
        startsWith: "MBR-",
      },
    },
    orderBy: {
      code: "desc",
    },
    select: {
      code: true,
    },
  });

  if (!lastMember) {
    return "MBR-000001";
  }

  const numPart = parseInt(lastMember.code.replace("MBR-", ""), 10);
  const nextNum = isNaN(numPart) ? 1 : numPart + 1;
  return `MBR-${String(nextNum).padStart(6, "0")}`;
}

/**
 * Buat Member Baru (Hanya ADMIN)
 * Otomatis memasukkan bonus pendaftaran (BONUS, 10 poin dari Setting)
 */
export async function createMember(data: MemberFormData) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang dapat mendaftarkan member");
  }

  const validated = MemberSchema.parse(data);
  const normalizedPhone = normalizePhone(validated.phone);

  // Cek keunikan nomor HP
  const existingPhone = await prisma.member.findUnique({
    where: { phone: normalizedPhone },
  });

  if (existingPhone) {
    throw new Error(`Nomor HP ${normalizedPhone} sudah terdaftar atas nama ${existingPhone.name}`);
  }

  const signupBonus = await getSettingNumber(SETTING_KEYS.SIGNUP_BONUS).catch(() => 10);

  // Retry loop untuk mencegah race condition kode member unik
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const code = await getNextMemberCode();

    try {
      const result = await prisma.$transaction(async (tx) => {
        const member = await tx.member.create({
          data: {
            code,
            name: validated.name,
            phone: normalizedPhone,
            email: validated.email || null,
            source: "ADMIN",
            isActive: true,
            waOptIn: validated.waOptIn,
            waOptInAt: validated.waOptIn ? new Date() : null,
          },
        });

        // Masukkan bonus pendaftaran
        if (signupBonus > 0) {
          await tx.pointLedger.create({
            data: {
              memberId: member.id,
              points: signupBonus,
              type: "BONUS",
              note: `Bonus pendaftaran member baru (${signupBonus} poin)`,
              createdById: user.id,
            },
          });
        }

        return member;
      });

      revalidatePath("/admin/member");
      return { success: true, member: result };
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      // Prisma P2002 adalah Unique Constraint Failed
      if (error?.code === "P2002" && attempts < maxAttempts) {
        continue;
      }
      throw new Error(error?.message || "Gagal membuat member");
    }
  }

  throw new Error("Gagal mengalokasikan kode member. Silakan coba lagi.");
}

/**
 * Update Member (Hanya ADMIN)
 */
export async function updateMember(id: string, data: MemberFormData) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang dapat mengubah member");
  }

  const validated = MemberSchema.parse(data);
  const normalizedPhone = normalizePhone(validated.phone);

  // Cek nomor HP jika berubah
  const existing = await prisma.member.findFirst({
    where: {
      phone: normalizedPhone,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`Nomor HP ${normalizedPhone} sudah digunakan oleh member lain (${existing.name})`);
  }

  const updated = await prisma.member.update({
    where: { id },
    data: {
      name: validated.name,
      phone: normalizedPhone,
      email: validated.email || null,
      waOptIn: validated.waOptIn,
    },
  });

  revalidatePath("/admin/member");
  return { success: true, member: updated };
}

/**
 * Toggle Status Aktif / Nonaktif Member (Hanya ADMIN)
 */
export async function toggleMemberActive(id: string) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang dapat mengubah status member");
  }

  const member = await prisma.member.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  const updated = await prisma.member.update({
    where: { id },
    data: {
      isActive: !member.isActive,
    },
  });

  revalidatePath("/admin/member");
  return { success: true, isActive: updated.isActive };
}

import { generateMemberQrDataUrl } from "@/lib/qr";
export { generateMemberQrDataUrl };

/**
 * Ambil daftar member dengan paginasi, pencarian, dan kalkulasi saldo & level
 */
export async function getMembersList(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "CASHIER")) {
    throw new Error("Akses ditolak: hanya staf yang diizinkan");
  }

  const search = params.search?.trim();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};

  if (search) {
    const normalizedPhoneSearch = search.replace(/\D/g, "");
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search.toUpperCase() } },
      ...(normalizedPhoneSearch.length >= 3
        ? [{ phone: { contains: normalizedPhoneSearch } }]
        : [{ phone: { contains: search } }]),
    ];
  }

  const [totalCount, members] = await Promise.all([
    prisma.member.count({ where: whereClause }),
    prisma.member.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    }),
  ]);

  // Hitung saldo dan level untuk tiap member
  const enrichedMembers = await Promise.all(
    members.map(async (m) => {
      const [balance, level] = await Promise.all([
        getMemberBalance(m.id),
        getMemberLevel(m.id),
      ]);
      return {
        ...m,
        balance,
        level,
        transactionCount: m._count.transactions,
      };
    })
  );

  return {
    members: enrichedMembers,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}
