import prisma from "@/lib/prisma";

export interface ExecuteAdjustParams {
  memberId: string;
  points: number;
  reason: string;
  actorId?: string;
}

/**
 * Logika Inti Koreksi Poin (ADJUST)
 * 1. Alasan wajib (minimal 3 karakter)
 * 2. Tidak boleh 0
 * 3. Jika pengurangan, pastikan saldo tidak menjadi negatif
 * 4. Catat ke PointLedger tipe ADJUST
 */
export async function executeAdjustPoints(params: ExecuteAdjustParams) {
  const { memberId, points, reason, actorId } = params;

  if (points === 0) {
    throw new Error("Nilai penyesuaian poin tidak boleh 0");
  }

  const cleanReason = reason.trim();
  if (!cleanReason || cleanReason.length < 3) {
    throw new Error("Alasan koreksi wajib diisi (minimal 3 karakter)");
  }

  return await prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, code: true, isActive: true },
    });

    if (!member) {
      throw new Error("Member tidak ditemukan");
    }

    // Cek saldo saat ini
    const balanceAgg = await tx.pointLedger.aggregate({
      where: { memberId },
      _sum: { points: true },
    });
    const currentBalance = balanceAgg._sum.points ?? 0;

    // Jika pengurangan, pastikan saldo tidak jadi negatif
    if (points < 0 && currentBalance + points < 0) {
      throw new Error(
        `Pengurangan poin ditolak: Saldo saat ini (${currentBalance} poin) tidak mencukupi untuk pengurangan ${Math.abs(
          points
        )} poin.`
      );
    }

    const now = new Date();

    const entry = await tx.pointLedger.create({
      data: {
        memberId,
        points,
        type: "ADJUST",
        note: `[Koreksi Admin] ${cleanReason}`,
        createdById: actorId,
        createdAt: now,
      },
    });

    const newBalance = currentBalance + points;

    return {
      success: true,
      entry,
      newBalance,
    };
  });
}

