import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Branch
  const branch = await prisma.branch.upsert({
    where: { id: "branch-pusat" },
    update: {},
    create: {
      id: "branch-pusat",
      name: "Kopi Nuri Pusat",
      address: "Jl. Contoh No. 1, Jakarta",
    },
  });
  console.log("✅ Branch:", branch.name);

  // 2. Users (ADMIN + CASHIER)
  const adminHash = await hash("admin123", 12);
  const cashierHash = await hash("kasir123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Administrator",
      username: "admin",
      passwordHash: adminHash,
      role: "ADMIN",
      branchId: branch.id,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { username: "kasir" },
    update: {},
    create: {
      name: "Kasir 1",
      username: "kasir",
      passwordHash: cashierHash,
      role: "CASHIER",
      branchId: branch.id,
    },
  });
  console.log("✅ Users: admin, kasir");

  // 3. Settings
  const settings = [
    { key: "earn_rupiah_unit", value: "10000" },
    { key: "earn_points_per_unit", value: "5" },
    { key: "signup_bonus", value: "10" },
    { key: "redeem_min_points", value: "100" },
    { key: "level_silver_min", value: "0" },
    { key: "level_gold_min", value: "500" },
    { key: "level_platinum_min", value: "1500" },
    { key: "wa_inactive_days", value: "14" },
    { key: "wa_cooldown_days", value: "30" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("✅ Settings:", settings.length, "entries");

  // 4. Rewards
  const rewards = [
    {
      name: "Es Kopi Susu",
      description: "Es kopi susu signature Kopi Nuri",
      pointsCost: 100,
      stock: 50,
    },
    {
      name: "Americano",
      description: "Americano hot/iced pilihan",
      pointsCost: 100,
      stock: 50,
    },
    {
      name: "Roti Bakar Coklat",
      description: "Roti bakar coklat keju",
      pointsCost: 150,
      stock: 30,
    },
    {
      name: "Matcha Latte",
      description: "Matcha latte premium",
      pointsCost: 120,
      stock: 40,
    },
    {
      name: "Croissant",
      description: "Croissant butter fresh-baked",
      pointsCost: 200,
      stock: 20,
    },
  ];

  for (const r of rewards) {
    const existing = await prisma.reward.findFirst({
      where: { name: r.name },
    });
    if (!existing) {
      await prisma.reward.create({ data: r });
    }
  }
  console.log("✅ Rewards:", rewards.length, "items");

  // 5. Members + Transaksi + Ledger
  const memberData = [
    { name: "Budi Santoso", phone: "6281234567001" },
    { name: "Siti Rahayu", phone: "6281234567002" },
    { name: "Ahmad Fauzi", phone: "6281234567003" },
    { name: "Dewi Lestari", phone: "6281234567004" },
    { name: "Eko Prasetyo", phone: "6281234567005" },
    { name: "Fitri Handayani", phone: "6281234567006" },
    { name: "Gunawan Wibowo", phone: "6281234567007" },
    { name: "Hana Permata", phone: "6281234567008" },
    { name: "Irfan Hakim", phone: "6281234567009" },
    { name: "Joko Widodo", phone: "6281234567010" },
    { name: "Kartika Sari", phone: "6281234567011" },
    { name: "Lukman Hakim", phone: "6281234567012" },
    { name: "Maya Anggraini", phone: "6281234567013" },
    { name: "Nadia Putri", phone: "6281234567014" },
    { name: "Oscar Pratama", phone: "6281234567015" },
  ];

  // Aturan poin dari settings
  const earnUnit = 10000;
  const earnPointsPerUnit = 5;
  const signupBonus = 10;

  const shifts: ("PAGI" | "SIANG" | "MALAM")[] = ["PAGI", "SIANG", "MALAM"];

  for (let i = 0; i < memberData.length; i++) {
    const md = memberData[i];
    const code = `MBR-${String(i + 1).padStart(6, "0")}`;

    // Upsert member
    const member = await prisma.member.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: md.name,
        phone: md.phone,
        source: "ADMIN",
        waOptIn: i % 3 === 0, // Beberapa opt-in WA
        waOptInAt: i % 3 === 0 ? new Date() : null,
      },
    });

    // Cek apakah bonus signup sudah ada
    const existingBonus = await prisma.pointLedger.findFirst({
      where: { memberId: member.id, type: "BONUS" },
    });

    if (!existingBonus) {
      // Bonus signup: 10 poin
      await prisma.pointLedger.create({
        data: {
          memberId: member.id,
          points: signupBonus,
          type: "BONUS",
          note: "Bonus pendaftaran member baru",
          createdById: admin.id,
        },
      });
    }

    // Buat beberapa transaksi per member (variasi jumlah)
    const existingTx = await prisma.transaction.findFirst({
      where: { memberId: member.id },
    });

    if (!existingTx) {
      // Transaksi bervariasi per member
      const txAmounts = getTxAmounts(i);

      for (let t = 0; t < txAmounts.length; t++) {
        const amount = txAmounts[t];
        const pointsEarned =
          Math.floor(amount / earnUnit) * earnPointsPerUnit;
        const shift = shifts[t % shifts.length];
        const txDate = new Date();
        txDate.setDate(txDate.getDate() - (txAmounts.length - t) * 2);

        const tx = await prisma.transaction.create({
          data: {
            memberId: member.id,
            cashierId: t % 2 === 0 ? admin.id : cashier.id,
            branchId: branch.id,
            shift,
            amount,
            pointsEarned,
            idempotencyKey: `seed-${code}-tx-${t}`,
            createdAt: txDate,
          },
        });

        // Ledger EARN
        if (pointsEarned > 0) {
          await prisma.pointLedger.create({
            data: {
              memberId: member.id,
              points: pointsEarned,
              type: "EARN",
              note: `Transaksi ${formatRp(amount)}`,
              transactionId: tx.id,
              createdById: t % 2 === 0 ? admin.id : cashier.id,
              createdAt: txDate,
            },
          });
        }
      }

      // Update lastVisitAt
      await prisma.member.update({
        where: { id: member.id },
        data: { lastVisitAt: new Date() },
      });
    }
  }

  console.log("✅ Members:", memberData.length, "with transactions & ledger");
  console.log("🌱 Seeding selesai!");
}

function getTxAmounts(memberIndex: number): number[] {
  // Variasi transaksi untuk membuat data beragam
  const patterns = [
    [25000, 50000, 85000, 120000, 45000], // Member aktif
    [30000, 15000, 70000],                 // Member moderat
    [200000, 150000, 300000, 250000, 180000, 95000], // Member high-value
    [9000, 25000],                         // Member jarang
    [45000, 55000, 35000, 65000],          // Member reguler
    [100000, 200000, 150000, 80000, 120000, 90000, 110000], // Member sangat aktif
    [20000, 40000, 60000],                 // Member baru
    [75000, 85000, 95000, 65000, 55000],   // Member konsisten
    [500000, 300000, 200000],              // Member VIP
    [15000, 25000, 10000],                 // Member hemat
    [50000, 70000, 90000, 110000],         // Member growing
    [35000, 45000],                        // Member baru
    [180000, 220000, 160000, 140000, 200000], // Member loyal
    [30000, 20000, 40000],                 // Member casual
    [60000, 80000, 100000, 120000, 140000, 60000], // Member trending up
  ];
  return patterns[memberIndex % patterns.length];
}

function formatRp(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

