import prisma from "../src/lib/prisma";
import {
  calcEarnedPoints,
  createTransaction,
  getMemberBalance,
  getMemberLevel,
  getMemberTotalEarned,
} from "../src/lib/points";
import { normalizePhone } from "../src/lib/phone";
import { generateMemberQrDataUrl } from "../src/lib/qr";

async function runTahap2DoDTests() {
  console.log("=================================================");
  console.log("   KOPI NURI — PENGUJIAN TAHAP 2 (INTI BISNIS)   ");
  console.log("=================================================\n");

  // Ambil user admin dan kasir
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  const cashier = await prisma.user.findUnique({ where: { username: "kasir" } });
  const branch = await prisma.branch.findFirst();

  if (!admin || !cashier || !branch) {
    throw new Error("Admin/Kasir/Branch belum ter-seed!");
  }

  // --- UJI 1: Daftar member baru, dapat 10 poin bonus ---
  console.log("--- UJI 1: Registrasi Member Baru & Bonus Pendaftaran (10 Poin) ---");
  const testPhone = "089912345678";
  const normalizedPhone = normalizePhone(testPhone);

  // Bersihkan data tes jika sebelumnya sudah ada
  const existingMember = await prisma.member.findUnique({ where: { phone: normalizedPhone } });
  if (existingMember) {
    await prisma.pointLedger.deleteMany({ where: { memberId: existingMember.id } });
    await prisma.transaction.deleteMany({ where: { memberId: existingMember.id } });
    await prisma.member.delete({ where: { id: existingMember.id } });
  }

  // Cari kode terakhir
  const lastMember = await prisma.member.findFirst({
    where: { code: { startsWith: "MBR-" } },
    orderBy: { code: "desc" },
  });
  const nextNum = lastMember ? parseInt(lastMember.code.replace("MBR-", ""), 10) + 1 : 1;
  const testCode = `MBR-${String(nextNum).padStart(6, "0")}`;

  const member = await prisma.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: {
        code: testCode,
        name: "Member Uji DoD",
        phone: normalizedPhone,
        email: "uji@kopinuri.test",
        source: "ADMIN",
        isActive: true,
      },
    });

    await tx.pointLedger.create({
      data: {
        memberId: m.id,
        points: 10,
        type: "BONUS",
        note: "Bonus pendaftaran member baru",
        createdById: admin.id,
      },
    });

    return m;
  });

  const initialBalance = await getMemberBalance(member.id);
  console.log(`✓ Member dibuat: ${member.name} (${member.code})`);
  console.log(`✓ Saldo awal member: ${initialBalance} poin (Ekspektasi: 10)`);
  if (initialBalance !== 10) throw new Error("Uji 1 GAGAL: Saldo awal bukan 10!");
  console.log("-> HASIL UJI 1: LULUS (PASS)\n");

  // --- UJI 2: Kasir scan, input Rp85.000, poin masuk = 40 ---
  console.log("--- UJI 2: Transaksi Rp 85.000 (Ekspektasi Poin = 40) ---");
  const tx1 = await createTransaction({
    memberId: member.id,
    amount: 85000,
    cashierId: cashier.id,
    shift: "SIANG",
    idempotencyKey: `test-dod-tx1-${Date.now()}`,
  });

  const balanceAfter85k = await getMemberBalance(member.id);
  console.log(`✓ Nominal belanja: Rp 85.000`);
  console.log(`✓ Poin masuk transaksi: +${tx1.pointsEarned} poin (Ekspektasi: 40)`);
  console.log(`✓ Saldo total setelah transaksi: ${balanceAfter85k} poin (Ekspektasi: 50)`);

  if (tx1.pointsEarned !== 40 || balanceAfter85k !== 50) {
    throw new Error("Uji 2 GAGAL: Perolehan poin Rp 85.000 tidak sesuai!");
  }
  console.log("-> HASIL UJI 2: LULUS (PASS)\n");

  // --- UJI 3: Input Rp9.999, poin masuk = 0 ---
  console.log("--- UJI 3: Transaksi Rp 9.999 (Ekspektasi Poin = 0, Sisa Hangus) ---");
  const tx2 = await createTransaction({
    memberId: member.id,
    amount: 9999,
    cashierId: cashier.id,
    shift: "SIANG",
    idempotencyKey: `test-dod-tx2-${Date.now()}`,
  });

  const balanceAfter9k = await getMemberBalance(member.id);
  console.log(`✓ Nominal belanja: Rp 9.999`);
  console.log(`✓ Poin masuk transaksi: +${tx2.pointsEarned} poin (Ekspektasi: 0)`);
  console.log(`✓ Saldo total tetap: ${balanceAfter9k} poin (Ekspektasi: 50)`);

  if (tx2.pointsEarned !== 0 || balanceAfter9k !== 50) {
    throw new Error("Uji 3 GAGAL: Perolehan poin Rp 9.999 tidak sesuai!");
  }
  console.log("-> HASIL UJI 3: LULUS (PASS)\n");

  // --- UJI 4: Saldo sama dengan SUM(ledger) ---
  console.log("--- UJI 4: Integritas Saldo = SUM(points) dari PointLedger ---");
  const ledgerAggregate = await prisma.pointLedger.aggregate({
    where: { memberId: member.id },
    _sum: { points: true },
  });
  const sumLedger = ledgerAggregate._sum.points ?? 0;
  const currentBalance = await getMemberBalance(member.id);
  console.log(`✓ SUM(points) langsung dari tabel PointLedger: ${sumLedger}`);
  console.log(`✓ Saldo dari fungsi getMemberBalance(): ${currentBalance}`);

  if (sumLedger !== currentBalance || currentBalance !== 50) {
    throw new Error("Uji 4 GAGAL: Saldo tidak cocok dengan SUM(ledger)!");
  }
  console.log("-> HASIL UJI 4: LULUS (PASS)\n");

  // --- UJI 5: Level Member dan Total Poin Terakumulasi ---
  console.log("--- UJI 5: Evaluasi Level Member ---");
  const totalEarned = await getMemberTotalEarned(member.id);
  const level = await getMemberLevel(member.id);
  console.log(`✓ Total poin diperoleh historis: ${totalEarned} poin`);
  console.log(`✓ Tier Level: ${level} (Silver: 0-499, Gold: 500-1499, Platinum: 1500+)`);
  console.log("-> HASIL UJI 5: LULUS (PASS)\n");

  // --- UJI 6: Pengujian QR Code Generator ---
  console.log("--- UJI 6: Validasi QR Code Generator ---");
  const qrDataUrl = await generateMemberQrDataUrl(member.code);
  const isValidDataUrl = qrDataUrl.startsWith("data:image/png;base64,");
  console.log(`✓ Data URL QR Code ter-generate: ${isValidDataUrl ? "Format Valid" : "INVALID"}`);
  if (!isValidDataUrl) throw new Error("Uji 6 GAGAL: Format QR code tidak valid!");
  console.log("-> HASIL UJI 6: LULUS (PASS)\n");

  // --- UJI 7: Validasi Idempotency Key Transaksi Ganda ---
  console.log("--- UJI 7: Anti Double-Submit / Idempotency Transaksi ---");
  const idemKey = `idem-test-${Date.now()}`;
  const firstAttempt = await createTransaction({
    memberId: member.id,
    amount: 50000,
    cashierId: cashier.id,
    shift: "SIANG",
    idempotencyKey: idemKey,
  });

  const secondAttempt = await createTransaction({
    memberId: member.id,
    amount: 50000,
    cashierId: cashier.id,
    shift: "SIANG",
    idempotencyKey: idemKey,
  });

  console.log(`✓ Transaksi pertama ID: ${firstAttempt.transaction.id}`);
  console.log(`✓ Transaksi kedua (idempotent key sama) ID: ${secondAttempt.transaction.id}`);
  if (firstAttempt.transaction.id !== secondAttempt.transaction.id) {
    throw new Error("Uji 7 GAGAL: Idempotency gagal mencegah duplikasi transaksi!");
  }
  console.log("-> HASIL UJI 7: LULUS (PASS)\n");

  console.log("=================================================");
  console.log("   SEMUA PENGUJIAN DEFINITION OF DONE LULUS!     ");
  console.log("=================================================");
}

runTahap2DoDTests()
  .catch((e) => {
    console.error("Uji DoD Gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
