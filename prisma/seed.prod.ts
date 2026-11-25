import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cashierUsername = (process.env.CASHIER_USERNAME || "kasir").trim().toLowerCase();
  const cashierPassword = process.env.CASHIER_PASSWORD;

  if (!adminPassword || adminPassword.length < 8 || adminPassword === "admin123") {
    throw new Error(
      "ADMIN_PASSWORD wajib diisi di environment (minimal 8 karakter, bukan password default)."
    );
  }

  if (cashierPassword && (cashierPassword.length < 8 || cashierPassword === "kasir123")) {
    throw new Error(
      "CASHIER_PASSWORD minimal 8 karakter dan tidak boleh memakai password default."
    );
  }

  // 1. Cabang utama (idempoten)
  let branch = await prisma.branch.findFirst({
    where: { name: "Kopi Nuri Pusat" },
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Kopi Nuri Pusat",
        address: "Jl. Kopi Nuri No. 1",
      },
    });
  }

  // 2. Akun ADMIN produksi (idempoten, tidak menimpa password jika sudah ada)
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "Admin Kopi Nuri",
        username: adminUsername,
        passwordHash: await hash(adminPassword, 12),
        role: Role.ADMIN,
        isActive: true,
        branchId: branch.id,
      },
    });
  }

  // 3. Akun CASHIER produksi (opsional jika CASHIER_PASSWORD diisi)
  if (cashierPassword) {
    const existingCashier = await prisma.user.findUnique({
      where: { username: cashierUsername },
    });
    if (!existingCashier) {
      await prisma.user.create({
        data: {
          name: "Kasir Kopi Nuri",
          username: cashierUsername,
          passwordHash: await hash(cashierPassword, 12),
          role: Role.CASHIER,
          isActive: true,
          branchId: branch.id,
        },
      });
    }
  }

  // 4. Setting aturan bisnis Kopi Nuri (idempoten, hanya buat jika belum ada)
  const defaultSettings = [
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

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    });
  }

  console.log("Seed produksi selesai: Cabang, Akun Staf, dan Setting siap.");
}

main()
  .catch((err) => {
    console.error("Seed produksi gagal:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

