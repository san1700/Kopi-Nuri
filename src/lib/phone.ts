/**
 * Normalisasi nomor HP ke format internasional tanpa plus: 62812...
 */
export function normalizePhone(phone: string): string {
  // Hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, "");

  // Jika diawali dengan 0, ubah ke 62
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  // Jika diawali dengan +62, replace non-digit sudah menghapus +, jadi jika 62 tetap 62
  else if (!cleaned.startsWith("62")) {
    // Jika user mengetik langsung mis. 812..., tambahkan 62
    cleaned = "62" + cleaned;
  }

  return cleaned;
}

/**
 * Format nomor HP untuk tampilan: +62 812-3456-7890
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith("62") && normalized.length >= 10) {
    const prefix = normalized.slice(2, 5);
    const mid = normalized.slice(5, 9);
    const rest = normalized.slice(9);
    return `+62 ${prefix}-${mid}${rest ? "-" + rest : ""}`;
  }
  return phone;
}

