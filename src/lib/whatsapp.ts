import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { WaStatus } from "@prisma/client";

export interface SendTemplateResult {
  success: boolean;
  status: WaStatus;
  dryRun: boolean;
  to: string;
  templateName: string;
  previewMessage: string;
  waMessageId?: string;
  error?: string;
}

/**
 * Bangun pratinjau isi pesan template untuk log & tampilan admin
 */
export function buildTemplatePreview(
  templateName: string,
  params: string[]
): string {
  const name = params[0] ?? "{{1}}";
  const points = params[1] ?? "{{2}}";
  return `[${templateName}] Halo ${name}, sudah lama nih nggak ngopi di Kopi Nuri! Kamu masih punya ${points} poin yang bisa ditukar hadiah. Yuk mampir ngopi lagi! (Balas STOP untuk berhenti menerima pesan)`;
}

/**
 * Kirim pesan template WhatsApp via Meta Cloud API.
 * - Jika WA_DRY_RUN=true: tidak memanggil API, menulis WaMessageLog status SKIPPED.
 * - Token hanya dibaca dari env, tidak pernah dikirim ke client atau dicatat di log.
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  params: string[],
  options?: { memberId?: string }
): Promise<SendTemplateResult> {
  const normalizedTo = normalizePhone(to);
  const isDryRun = process.env.WA_DRY_RUN !== "false";
  const apiVersion = process.env.WA_API_VERSION || "v21.0";
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const accessToken = process.env.WA_ACCESS_TOKEN;
  const previewMessage = buildTemplatePreview(templateName, params);

  if (isDryRun) {
    if (options?.memberId) {
      await prisma.waMessageLog.create({
        data: {
          memberId: options.memberId,
          templateName,
          status: "SKIPPED",
          error: `DRY_RUN | ${previewMessage}`,
        },
      });
    }

    return {
      success: true,
      status: "SKIPPED",
      dryRun: true,
      to: normalizedTo,
      templateName,
      previewMessage,
    };
  }

  if (!phoneNumberId || !accessToken) {
    const errMsg = "Konfigurasi WA_PHONE_NUMBER_ID atau WA_ACCESS_TOKEN belum diisi";
    if (options?.memberId) {
      await prisma.waMessageLog.create({
        data: {
          memberId: options.memberId,
          templateName,
          status: "FAILED",
          error: errMsg,
        },
      });
    }

    return {
      success: false,
      status: "FAILED",
      dryRun: false,
      to: normalizedTo,
      templateName,
      previewMessage,
      error: errMsg,
    };
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: "id" },
          components:
            params.length > 0
              ? [
                  {
                    type: "body",
                    parameters: params.map((text) => ({
                      type: "text",
                      text: String(text),
                    })),
                  },
                ]
              : [],
        },
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number };
    };

    if (!response.ok) {
      const safeError = data?.error?.message || `HTTP ${response.status}`;
      if (options?.memberId) {
        await prisma.waMessageLog.create({
          data: {
            memberId: options.memberId,
            templateName,
            status: "FAILED",
            error: safeError,
          },
        });
      }

      return {
        success: false,
        status: "FAILED",
        dryRun: false,
        to: normalizedTo,
        templateName,
        previewMessage,
        error: safeError,
      };
    }

    const waMessageId = data?.messages?.[0]?.id;

    if (options?.memberId) {
      await prisma.waMessageLog.create({
        data: {
          memberId: options.memberId,
          templateName,
          status: "SENT",
          waMessageId: waMessageId ?? null,
        },
      });
    }

    return {
      success: true,
      status: "SENT",
      dryRun: false,
      to: normalizedTo,
      templateName,
      previewMessage,
      waMessageId,
    };
  } catch (err) {
    const safeError = err instanceof Error ? err.message : "Gagal menghubungi Graph API";
    if (options?.memberId) {
      await prisma.waMessageLog.create({
        data: {
          memberId: options.memberId,
          templateName,
          status: "FAILED",
          error: safeError,
        },
      });
    }

    return {
      success: false,
      status: "FAILED",
      dryRun: false,
      to: normalizedTo,
      templateName,
      previewMessage,
      error: safeError,
    };
  }
}

