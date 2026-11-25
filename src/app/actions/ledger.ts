"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LedgerType } from "@prisma/client";

export interface GetLedgerParams {
  search?: string;
  type?: LedgerType | "ALL";
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getLedgerList(params: GetLedgerParams) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "CASHIER")) {
    throw new Error("Akses ditolak: Anda harus login sebagai staf");
  }
  const search = params.search?.trim();
  const type = params.type && params.type !== "ALL" ? params.type : undefined;
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 15));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (type) {
    where.type = type;
  }

  if (search) {
    where.member = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search.toUpperCase() } },
        { phone: { contains: search } },
      ],
    };
  }

  if (params.startDate || params.endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (params.startDate) {
      const start = new Date(params.startDate);
      start.setHours(0, 0, 0, 0);
      createdAtFilter.gte = start;
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      createdAtFilter.lte = end;
    }
    where.createdAt = createdAtFilter;
  }

  const [totalCount, items] = await Promise.all([
    prisma.pointLedger.count({ where }),
    prisma.pointLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        member: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            shift: true,
          },
        },
        redemption: {
          select: {
            id: true,
            voucherCode: true,
            reward: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    items,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}

