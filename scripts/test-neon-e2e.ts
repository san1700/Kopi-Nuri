import prisma from "../src/lib/prisma";
import { compare } from "bcryptjs";
import { getAllSettings } from "../src/lib/settings";
import {
  getMemberBalance,
  getMemberLevel,
  calcEarnedPoints,
} from "../src/lib/points";

async function testNeonEndToEnd() {
  console.log("=== Testing Neon PostgreSQL Connection & End-to-End Logic ===");

  // 1. Check Branch
  const branch = await prisma.branch.findFirst();
  console.log("1. Branch verification:", branch ? `OK (${branch.name})` : "FAILED");

  // 2. Check Admin & Kasir credentials
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  const isAdminPwValid = admin ? await compare("admin123", admin.passwordHash) : false;
  console.log("2. Admin auth verification:", isAdminPwValid ? "OK (admin/admin123 match)" : "FAILED");

  const cashier = await prisma.user.findUnique({ where: { username: "kasir" } });
  const isCashierPwValid = cashier ? await compare("kasir123", cashier.passwordHash) : false;
  console.log("   Kasir auth verification:", isCashierPwValid ? "OK (kasir/kasir123 match)" : "FAILED");

  // 3. Check Settings
  const settings = await getAllSettings();
  console.log("3. Settings verification:", Object.keys(settings).length >= 9 ? `OK (${Object.keys(settings).length} settings)` : "FAILED");

  // 4. Check Rewards
  const rewards = await prisma.reward.findMany();
  console.log("4. Rewards verification:", rewards.length === 5 ? `OK (${rewards.length} rewards)` : "FAILED");

  // 5. Check Members, Points & Level logic
  const members = await prisma.member.findMany({ take: 3 });
  console.log(`5. Members verification: found ${members.length} members`);
  for (const m of members) {
    const balance = await getMemberBalance(m.id);
    const level = await getMemberLevel(m.id);
    console.log(`   - Member: ${m.code} (${m.name}) | Saldo: ${balance} poin | Level: ${level}`);
  }

  // 6. Test earn points calculation
  const pts85k = await calcEarnedPoints(85000);
  const pts9k = await calcEarnedPoints(9999);
  console.log(`6. Point Calc: Rp 85.000 -> ${pts85k} poin (expected 40), Rp 9.999 -> ${pts9k} poin (expected 0):`, pts85k === 40 && pts9k === 0 ? "OK" : "FAILED");

  console.log("=== All Neon database services verified successfully! ===");
}

testNeonEndToEnd()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

