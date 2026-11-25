import QRCode from "qrcode";

/**
 * Generate QR code Data URL untuk kode member
 * - Error correction level M
 * - Quiet zone minimal 4 modul
 * - Isi QR HANYA kode member (misal MBR-000001) tanpa URL atau data pribadi
 */
export async function generateMemberQrDataUrl(code: string): Promise<string> {
  return await QRCode.toDataURL(code.trim().toUpperCase(), {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 280,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

