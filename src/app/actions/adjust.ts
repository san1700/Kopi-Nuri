"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { executeAdjustPoints } from "@/lib/adjust";

export interface AdjustPointsInput {
  memberId: string;
  points: number;
  reason: string;
}

/**
 * Koreksi poin oleh ADMIN lewat entri PointLedger bertipe ADJUST (Server Action)
 * - Hanya ADMIN yang berhak melakukan koreksi
 * - Alasan (reason) WAJIB diisi
 * - Tidak boleh membuat saldo member menjadi negatif jika bernilai negatif
 * - Sesuai aturan bisnis: dilarang mengedit atau menghapus entri ledger lama
 */
export async function adjustMemberPoints(input: AdjustPointsInput) {
  const session = await auth();
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya ADMIN yang berhak melakukan koreksi poin (ADJUST)");
  }

  const result = await executeAdjustPoints({
    memberId: input.memberId,
    points: input.points,
    reason: input.reason,
    actorId: user.id,
  });

  revalidatePath("/admin/riwayat");
  revalidatePath("/admin/member");
  revalidatePath("/admin");
  revalidatePath("/kasir/tukar");

  return {
    success: true,
    entry: result.entry,
    newBalance: result.newBalance,
  };
}
