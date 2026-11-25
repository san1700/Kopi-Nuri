import prisma from "../src/lib/prisma";
import {
  executeRedeemReward,
  executeValidateVoucher,
  getVoucherDetailByCode,
  UNAMBIGUOUS_CHARS,
} from "../src/lib/redemption";
import { executeAdjustPoints } from "../src/lib/adjust";
import { getMemberBalance } from "../src/lib/points";
import { normalizePhone } from "../src/lib/phone";

async function runTahap3DoDTests() {
  console.log("=================================================");
  console.log("   KOPI NURI — PENGUJIAN TAHAP 3 (REWARD & VOUCHER)   ");
  console.log("=================================================\n");

  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  const cashier = await prisma.user.findUnique({ where: { username: "kasir" } });

  if (!admin || !cashier) {
    throw new Error("Admin atau Kasir belum ter-seed!");
  }

  // Siapkan reward untuk pengujian
  let testReward = await prisma.reward.findFirst({
    where: { pointsCost: 100, isActive: true },
  });

  if (!testReward) {
    testReward = await prisma.reward.create({
      data: {
        name: "Es Kopi Susu Gula Aren Uji",
        description: "Signature coffee untuk pengujian",
        pointsCost: 100,
        stock: 50,
        isActive: true,
      },
    });
  }

  // --- UJI 1: Penukaran reward ditolak jika saldo kurang (DoD 5a) ---
  console.log("--- UJI 1 (DoD 5a): Penukaran Ditolak Jika Poin Kurang / Di Bawah Minimal ---");
  const phone1 = normalizePhone("089988770001");
  let memberLow = await prisma.member.findUnique({ where: { phone: phone1 } });
  if (memberLow) {
    await prisma.pointLedger.deleteMany({ where: { memberId: memberLow.id } });
    await prisma.redemption.deleteMany({ where: { memberId: memberLow.id } });
    await prisma.member.delete({ where: { id: memberLow.id } });
  }

  memberLow = await prisma.member.create({
    data: {
      code: "MBR-TEST01",
      name: "Member Saldo Kurang",
      phone: phone1,
      isActive: true,
    },
  });

  // Masukkan hanya 40 poin (kurang dari redeem_min_points 100 & kurang dari 100 poin reward)
  await prisma.pointLedger.create({
    data: {
      memberId: memberLow.id,
      points: 40,
      type: "BONUS",
      note: "Poin awal uji",
      createdById: admin.id,
    },
  });

  const lowBal = await getMemberBalance(memberLow.id);
  console.log(`✓ Member low: ${memberLow.name}, Saldo saat ini: ${lowBal} pts`);

  let lowRejected = false;
  try {
    await executeRedeemReward({
      memberId: memberLow.id,
      rewardId: testReward.id,
      actorId: cashier.id,
    });
  } catch (err: unknown) {
    lowRejected = true;
    console.log(`✓ Penukaran berhasil dicegah: "${(err as Error).message}"`);
  }

  if (!lowRejected) {
    throw new Error("Uji 1 GAGAL: Penukaran harusnya ditolak karena poin kurang!");
  }
  console.log("-> HASIL UJI 1: LULUS (PASS)\n");

  // --- UJI 2: Penukaran reward berhasil dengan poin cukup (DoD 5b) ---
  console.log("--- UJI 2 (DoD 5b): Penukaran Berhasil, Voucher & Ledger Negatif Valid ---");
  const phone2 = normalizePhone("089988770002");
  let memberRich = await prisma.member.findUnique({ where: { phone: phone2 } });
  if (memberRich) {
    await prisma.pointLedger.deleteMany({ where: { memberId: memberRich.id } });
    await prisma.redemption.deleteMany({ where: { memberId: memberRich.id } });
    await prisma.member.delete({ where: { id: memberRich.id } });
  }

  memberRich = await prisma.member.create({
    data: {
      code: "MBR-TEST02",
      name: "Member Saldo Cukup",
      phone: phone2,
      isActive: true,
    },
  });

  // Berikan 250 poin
  await prisma.pointLedger.create({
    data: {
      memberId: memberRich.id,
      points: 250,
      type: "BONUS",
      note: "Poin awal 250",
      createdById: admin.id,
    },
  });

  const initialStock = testReward.stock ?? 999;
  const redeemRes = await executeRedeemReward({
    memberId: memberRich.id,
    rewardId: testReward.id,
    actorId: cashier.id,
  });

  console.log(`✓ Penukaran sukses! Voucher Code: ${redeemRes.redemption.voucherCode}`);
  console.log(`✓ Format voucher: ${redeemRes.redemption.voucherCode.startsWith("KN-") ? "KN-XXXXXX (VALID)" : "INVALID"}`);
  console.log(`✓ Sisa saldo member: ${redeemRes.newBalance} pts (Ekspektasi: 150 pts)`);
  console.log(`✓ QR Code Data URL dibuat: ${redeemRes.qrDataUrl.startsWith("data:image/png;base64,") ? "VALID (PNG)" : "INVALID"}`);

  // Cek karakter ambigu pada voucher code
  const codeChars = redeemRes.redemption.voucherCode.replace("KN-", "");
  const hasAmbiguous = /[01OI]/.test(codeChars);
  if (hasAmbiguous) {
    throw new Error(`Uji 2 GAGAL: Kode voucher mengandung karakter ambigu: ${redeemRes.redemption.voucherCode}`);
  }

  // Cek PointLedger bertipe REDEEM bernilai -100
  const redeemLedger = await prisma.pointLedger.findFirst({
    where: { redemptionId: redeemRes.redemption.id },
  });

  if (!redeemLedger || redeemLedger.points !== -100 || redeemLedger.type !== "REDEEM") {
    throw new Error("Uji 2 GAGAL: PointLedger tipe REDEEM bernilai negatif tidak tercatat!");
  }
  console.log(`✓ PointLedger terverifikasi: Tipe=${redeemLedger.type}, Poin=${redeemLedger.points}`);

  if (redeemRes.newBalance !== 150) {
    throw new Error(`Uji 2 GAGAL: Saldo akhir ${redeemRes.newBalance} tidak sesuai (ekspektasi 150)`);
  }
  console.log("-> HASIL UJI 2: LULUS (PASS)\n");

  // --- UJI 3: Validasi voucher dan pencegahan pakai ulang (DoD 6) ---
  console.log("--- UJI 3 (DoD 6): Validasi Voucher di Kasir & Tolak Pakai Ulang ---");
  const testVoucherCode = redeemRes.redemption.voucherCode;

  // Cek detail sebelum dipakai
  const detailBefore = await getVoucherDetailByCode(testVoucherCode);
  if (!detailBefore.success || !detailBefore.voucher) {
    throw new Error("Uji 3 GAGAL: Gagal mengambil detail voucher");
  }
  console.log(`✓ Status voucher awal: ${detailBefore.voucher.status} (Ekspektasi: UNUSED)`);
  if (detailBefore.voucher.status !== "UNUSED") {
    throw new Error("Uji 3 GAGAL: Status voucher awal bukan UNUSED");
  }

  // Kasir memvalidasi dan menandai dipakai
  const validateRes = await executeValidateVoucher({
    voucherCode: testVoucherCode,
    actorId: cashier.id,
  });
  console.log(`✓ Voucher berhasil divalidasi! Status sekarang: ${validateRes.voucher.status}`);
  if (validateRes.voucher.status !== "USED" || !validateRes.voucher.usedAt) {
    throw new Error("Uji 3 GAGAL: Voucher belum tertandai USED / usedAt null");
  }

  // Coba validasi kedua kali (harus DITOLAK)
  let reuseRejected = false;
  try {
    await executeValidateVoucher({
      voucherCode: testVoucherCode,
      actorId: cashier.id,
    });
  } catch (err: unknown) {
    reuseRejected = true;
    console.log(`✓ Pakai ulang berhasil dicegah: "${(err as Error).message}"`);
  }

  if (!reuseRejected) {
    throw new Error("Uji 3 GAGAL: Voucher yang sudah USED tidak dicegah saat dipakai ulang!");
  }
  console.log("-> HASIL UJI 3: LULUS (PASS)\n");

  // --- UJI 4: Simulasi Dua Tab Kasir / Concurrency Race Condition ---
  console.log("--- UJI 4: Simulasi Dua Tab Kasir — Saldo Tidak Bisa Minus Saat Penukaran Bersamaan ---");
  const phoneRace = normalizePhone("089988770003");
  let memberRace = await prisma.member.findUnique({ where: { phone: phoneRace } });
  if (memberRace) {
    await prisma.pointLedger.deleteMany({ where: { memberId: memberRace.id } });
    await prisma.redemption.deleteMany({ where: { memberId: memberRace.id } });
    await prisma.member.delete({ where: { id: memberRace.id } });
  }

  memberRace = await prisma.member.create({
    data: {
      code: "MBR-RACE01",
      name: "Member Uji Konkurensi",
      phone: phoneRace,
      isActive: true,
    },
  });

  // Saldo TEPAT 100 poin (hanya cukup untuk 1x penukaran reward 100 poin)
  await prisma.pointLedger.create({
    data: {
      memberId: memberRace.id,
      points: 100,
      type: "BONUS",
      note: "Modal saldo tepat 100 poin",
      createdById: admin.id,
    },
  });

  const raceBalStart = await getMemberBalance(memberRace.id);
  console.log(`✓ Modal saldo awal: ${raceBalStart} pts (Cukup tepat untuk 1 reward 100 pts)`);

  console.log("⚡ Menjalankan 2 penukaran simultan (Simulasi Tab Kasir A & Tab Kasir B)...");
  const [tab1Result, tab2Result] = await Promise.allSettled([
    executeRedeemReward({
      memberId: memberRace.id,
      rewardId: testReward.id,
      actorId: cashier.id,
    }),
    executeRedeemReward({
      memberId: memberRace.id,
      rewardId: testReward.id,
      actorId: cashier.id,
    }),
  ]);

  const fulfilledCount = [tab1Result, tab2Result].filter((r) => r.status === "fulfilled").length;
  const rejectedCount = [tab1Result, tab2Result].filter((r) => r.status === "rejected").length;

  console.log(`✓ Hasil Tab Kasir 1: ${tab1Result.status === "fulfilled" ? "SUKSES (Voucher Diterbitkan)" : "GAGAL DITOLAK: " + (tab1Result as PromiseRejectedResult).reason.message}`);
  console.log(`✓ Hasil Tab Kasir 2: ${tab2Result.status === "fulfilled" ? "SUKSES (Voucher Diterbitkan)" : "GAGAL DITOLAK: " + (tab2Result as PromiseRejectedResult).reason.message}`);

  if (fulfilledCount !== 1 || rejectedCount !== 1) {
    throw new Error(
      `Uji 4 GAGAL: Diharapkan tepat 1 sukses dan 1 gagal, namun didapat ${fulfilledCount} sukses dan ${rejectedCount} gagal!`
    );
  }

  // Cek saldo di database: TIDAK BOLEH MINUS
  const finalRaceBalance = await getMemberBalance(memberRace.id);
  console.log(`✓ Saldo akhir member di database: ${finalRaceBalance} pts (Ekspektasi: 0 pts, TIDAK MINUS)`);

  if (finalRaceBalance < 0) {
    throw new Error(`Uji 4 GAGAL: Terjadi anomali saldo negatif (${finalRaceBalance})!`);
  }
  if (finalRaceBalance !== 0) {
    throw new Error(`Uji 4 GAGAL: Saldo akhir bukan 0 melainkan ${finalRaceBalance}`);
  }
  console.log("-> HASIL UJI 4: LULUS (PASS) — Terbukti Saldo Tidak Bisa Minus Saat Penukaran Bersamaan!\n");

  // --- UJI 5: Koreksi Poin (ADJUST) oleh Admin ---
  console.log("--- UJI 5: Koreksi Poin (ADJUST) oleh Admin dengan Alasan Wajib ---");
  // 5a. Tambah poin +50 dengan alasan
  const adjustAdd = await executeAdjustPoints({
    memberId: memberRace.id,
    points: 50,
    reason: "Kompensasi insiden delay minuman kasir",
    actorId: admin.id,
  });
  console.log(`✓ Koreksi Tambah Poin +50: Saldo baru = ${adjustAdd.newBalance} pts`);
  if (adjustAdd.newBalance !== 50 || adjustAdd.entry.type !== "ADJUST") {
    throw new Error("Uji 5a GAGAL: Koreksi tambah poin tidak sesuai");
  }

  // 5b. Kurangi poin yang melebihi saldo (-100 padahal saldo 50) -> Harus DITOLAK
  let overSubtractRejected = false;
  try {
    await executeAdjustPoints({
      memberId: memberRace.id,
      points: -100,
      reason: "Koreksi salah input poin",
      actorId: admin.id,
    });
  } catch (err: unknown) {
    overSubtractRejected = true;
    console.log(`✓ Pengurangan berlebih berhasil dicegah: "${(err as Error).message}"`);
  }

  if (!overSubtractRejected) {
    throw new Error("Uji 5b GAGAL: Pengurangan poin yang membuat saldo minus tidak dicegah!");
  }

  // 5c. Kurangi poin valid -20 dengan alasan
  const adjustSub = await executeAdjustPoints({
    memberId: memberRace.id,
    points: -20,
    reason: "Koreksi pembatalan menu",
    actorId: admin.id,
  });
  console.log(`✓ Koreksi Kurang Poin -20: Saldo baru = ${adjustSub.newBalance} pts (Ekspektasi: 30 pts)`);
  if (adjustSub.newBalance !== 30) {
    throw new Error("Uji 5c GAGAL: Saldo akhir koreksi bukan 30");
  }

  // 5d. Alasan kosong harus ditolak
  let emptyReasonRejected = false;
  try {
    await executeAdjustPoints({
      memberId: memberRace.id,
      points: 10,
      reason: "   ",
      actorId: admin.id,
    });
  } catch (err: unknown) {
    emptyReasonRejected = true;
    console.log(`✓ Alasan kosong berhasil dicegah: "${(err as Error).message}"`);
  }

  if (!emptyReasonRejected) {
    throw new Error("Uji 5d GAGAL: Alasan kosong tidak dicegah!");
  }
  console.log("-> HASIL UJI 5: LULUS (PASS)\n");

  console.log("=================================================");
  console.log("  SEMUA PENGUJIAN TAHAP 3 BERHASIL DENGAN LULUS  ");
  console.log("=================================================");
}

runTahap3DoDTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });

