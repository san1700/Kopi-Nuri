"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { buildTemplatePreview, sendTemplate } from "@/lib/whatsapp";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { WaStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const TestWhatsappSchema = z.object({
  phone: z.string().trim().min(8, "Nomor HP minimal 8 digit"),
  name: z.string().trim().min(1, "Nama uji wajib diisi").default("Sahabat Nuri"),
  points: z.string().trim().regex(/^\d+$/, "Poin harus berupa angka").default("120"),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Akses ditolak: hanya ADMIN yang diizinkan");
  }
  return session.user;
}

export async function getWhatsappDashboardData(params?: {
  status?: string;
  page?: number;
}) {
  await requireAdmin();

  const page = Math.max(1, params?.page ?? 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const validStatuses: WaStatus[] = ["QUEUED", "SENT", "FAILED", "SKIPPED"];
  const statusFilter =
    params?.status && validStatuses.includes(params.status as WaStatus)
      ? (params.status as WaStatus)
      : undefined;

  const where = statusFilter ? { status: statusFilter } : {};

  const [
    logs,
    totalCount,
    sentCount,
    skippedCount,
    failedCount,
    queuedCount,
    optInCount,
    inactiveDays,
    cooldownDays,
  ] = await Promise.all([
    prisma.waMessageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        member: {
          select: {
            code: true,
            name: true,
            phone: true,
            waOptIn: true,
          },
        },
      },
    }),
    prisma.waMessageLog.count({ where }),
    prisma.waMessageLog.count({ where: { status: "SENT" } }),
    prisma.waMessageLog.count({ where: { status: "SKIPPED" } }),
    prisma.waMessageLog.count({ where: { status: "FAILED" } }),
    prisma.waMessageLog.count({ where: { status: "QUEUED" } }),
    prisma.member.count({ where: { isActive: true, waOptIn: true } }),
    getSettingNumber(SETTING_KEYS.WA_INACTIVE_DAYS).catch(() => 14),
    getSettingNumber(SETTING_KEYS.WA_COOLDOWN_DAYS).catch(() => 30),
  ]);

  const templateName = process.env.WA_TEMPLATE_COMEBACK || "comeback_template";
  const apiVersion = process.env.WA_API_VERSION || "v21.0";
  const dryRun = process.env.WA_DRY_RUN !== "false";
  const hasCredentials = Boolean(
    process.env.WA_PHONE_NUMBER_ID && process.env.WA_ACCESS_TOKEN
  );

  return {
    config: {
      dryRun,
      templateName,
      apiVersion,
      hasCredentials,
      inactiveDays,
      cooldownDays,
      templatePreview: buildTemplatePreview(templateName, [
        "{{1}} (Nama Member)",
        "{{2}} (Saldo Poin)",
      ]),
    },
    stats: {
      sentCount,
      skippedCount,
      failedCount,
      queuedCount,
      optInCount,
    },
    logs,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    },
  };
}

export async function sendTestWhatsapp(formData: FormData) {
  await requireAdmin();

  const parsed = TestWhatsappSchema.safeParse({
    phone: formData.get("phone"),
    name: formData.get("name") || "Sahabat Nuri",
    points: formData.get("points") || "120",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const templateName = process.env.WA_TEMPLATE_COMEBACK || "comeback_template";

  // Jika nomor terdaftar sebagai member, catat juga ke WaMessageLog
  const member = await prisma.member.findUnique({
    where: { phone: normalizedPhone },
    select: { id: true, name: true },
  });

  const result = await sendTemplate(
    normalizedPhone,
    templateName,
    [parsed.data.name, parsed.data.points],
    member ? { memberId: member.id } : undefined
  );

  revalidatePath("/admin/whatsapp");

  return {
    success: result.success,
    status: result.status,
    dryRun: result.dryRun,
    to: result.to,
    previewMessage: result.previewMessage,
    waMessageId: result.waMessageId,
    loggedToMember: Boolean(member),
    error: result.error,
  };
}

