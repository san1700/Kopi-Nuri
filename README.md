# Kopi Nuri — Sistem Poin Member Berbasis QR Code

Sistem loyalty & point membership untuk brand **Kopi Nuri (Coffee & Space)** oleh Bento Group Indonesia.

---

## Prasyarat
- Node.js 18+ / 20+
- PostgreSQL (dapat menggunakan Neon cloud atau Docker lokal)

---

## Cara Menjalankan

### 1. Masuk ke direktori project & Install Dependencies
```bash
cd kopi-nuri
npm install
```

### 2. Konfigurasi Environment Variable
Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi `DATABASE_URL` dan `DIRECT_URL`.
- Jika memakai **Neon (PostgreSQL Cloud)**: tempel connection string dari dashboard Neon.
- Jika memakai **Docker Lokal**: jalankan kontainer database:
```bash
docker compose up -d
```
Dan pastikan `.env` mengarah ke:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kopi_nuri"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/kopi_nuri"
```

### 3. Generate Prisma Client & Jalankan Migrasi
```bash
# Generate client
npx prisma generate

# Jalankan migrasi ke database
npx prisma migrate deploy
# atau saat development:
npx prisma migrate dev
```

### 4. Jalankan Seed Database
Untuk mengisi cabang, akun admin & kasir, setting aturan bisnis, 5 reward contoh, dan 15 data member:
```bash
npm run db:seed
```

**Akun Bawaan (Default):**
- **Admin**: Username `admin` | Password `admin123`
- **Kasir**: Username `kasir` | Password `kasir123`

### 5. Jalankan Aplikasi (Development)
```bash
npm run dev
```
Buka browser di `http://localhost:3000`. Sistem akan otomatis mengarahkan ke `/login`.
- Login sebagai **admin** akan diarahkan ke `/admin`
- Login sebagai **kasir** akan diarahkan ke `/kasir`

---

## Integrasi WhatsApp Cloud API ("Ajakan Kembali")

Fitur ini mengirim pesan otomatis kepada member aktif yang menyetujui WhatsApp (`waOptIn = true`) namun sudah tidak berkunjung melewati `wa_inactive_days` (default 14 hari), dengan jeda antar pengiriman `wa_cooldown_days` (default 30 hari).

### 1. Konfigurasi Environment Variable
Isi variabel berikut di `.env` (atau di Environment Variables Vercel):

```env
# Secret untuk melindungi endpoint cron (/api/cron/wa-comeback)
CRON_SECRET="isi-secret-acak-yang-kuat"

# Mode simulasi: "true" = tidak memanggil API Meta, hanya menulis log SKIPPED
# Ubah ke "false" setelah akun Meta & template disetujui
WA_DRY_RUN="true"

# Kredensial dari Meta for Developers -> WhatsApp -> API Setup
WA_PHONE_NUMBER_ID="123456789012345"
WA_ACCESS_TOKEN="EAAG..."

# Nama template Marketing yang sudah disetujui di Meta
WA_TEMPLATE_COMEBACK="comeback_template"

# Versi Meta Graph API
WA_API_VERSION="v21.0"

# Token verifikasi webhook Meta (/api/wa/webhook)
WA_WEBHOOK_VERIFY_TOKEN="kopi-nuri-wa-verify-token"
```

> **Keamanan:** `WA_ACCESS_TOKEN` dan `CRON_SECRET` hanya dibaca di sisi server dan tidak pernah dikirim ke client maupun dicatat ke log.

### 2. Membuat Template Marketing di Meta Business Manager
Karena pesan dikirim di luar jendela layanan 24 jam, Meta mewajibkan penggunaan template berstatus **Approved** dengan kategori **Marketing**:

1. Buka **Meta Business Suite / WhatsApp Manager** → **Message Templates** → **Create Template**.
2. Pilih kategori **Marketing** dan bahasa **Indonesian (`id`)**.
3. Masukkan nama template sesuai `WA_TEMPLATE_COMEBACK` (contoh: `comeback_template`).
4. Isi bagian **Body** dengan 2 parameter (`{{1}}` = nama member, `{{2}}` = saldo poin):

```text
Halo {{1}}, sudah lama nih nggak ngopi di Kopi Nuri! Kamu masih punya {{2}} poin yang bisa ditukar hadiah. Yuk mampir ngopi lagi!

Balas STOP jika tidak ingin menerima pesan promo ini.
```

5. Isi contoh parameter (*Sample Content*) saat pengajuan (mis. `{{1}} = Budi`, `{{2}} = 120`), lalu klik **Submit** untuk review Meta.

### 3. Setup Webhook Opt-Out ("STOP") & Cron Harian
- **Webhook Meta**: Arahkan Callback URL di Meta App Dashboard ke `https://<domain-anda>/api/wa/webhook` dengan Verify Token yang sama dengan `WA_WEBHOOK_VERIFY_TOKEN`, lalu subscribe ke field `messages`. Saat member membalas `STOP`, sistem otomatis menyetel `waOptIn = false`.
- **Cron Harian**: File `vercel.json` menjadwalkan `/api/cron/wa-comeback` setiap hari pukul `03:00 UTC` (`10:00 WIB`). Endpoint hanya mengirim pada jam wajar (`09:00–20:00 WIB`) dan wajib menyertakan header `Authorization: Bearer <CRON_SECRET>`.

---

## Deploy Produksi (Vercel + Neon)

### 1. Environment Variables di Vercel
Tambahkan seluruh variabel berikut di **Vercel Project Settings → Environment Variables**:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string **Pooled** dari Neon (untuk runtime Next.js/serverless) |
| `DIRECT_URL` | Connection string **Direct** (tanpa `-pooler`) dari Neon (untuk `prisma migrate deploy`) |
| `AUTH_SECRET` | Secret acak minimal 32 karakter (`openssl rand -base64 32`) |
| `CRON_SECRET` | Secret acak untuk melindungi `/api/cron/wa-comeback` |
| `WA_DRY_RUN` | Set `"true"` sampai akun Meta & template disetujui (default aman: `"true"`) |
| `WA_PHONE_NUMBER_ID` | ID nomor WhatsApp Business dari Meta (kosongkan saat dry-run) |
| `WA_ACCESS_TOKEN` | Token akses permanen Meta System User (kosongkan saat dry-run) |
| `WA_TEMPLATE_COMEBACK` | Nama template Marketing Meta (contoh: `comeback_template`) |
| `WA_API_VERSION` | Versi Graph API Meta (contoh: `v21.0`) |
| `WA_WEBHOOK_VERIFY_TOKEN` | Token verifikasi webhook Meta |

### 2. Migrasi & Seed Produksi
Jangan gunakan `npm run db:seed` di produksi karena memakai password contoh (`admin123` / `kasir123`). Gunakan `db:seed:prod`:

```bash
# 1. Jalankan migrasi produksi
npx prisma migrate deploy

# 2. Jalankan seed produksi dengan password kuat (tidak memakai password default)
ADMIN_USERNAME="admin" \
ADMIN_PASSWORD="PasswordAdminKuat123!" \
CASHIER_USERNAME="kasir" \
CASHIER_PASSWORD="PasswordKasirKuat123!" \
npm run db:seed:prod
```

### 3. Cron Vercel
File `vercel.json` sudah dikonfigurasi untuk menjalankan `/api/cron/wa-comeback` sekali sehari (`0 3 * * *` UTC / `10:00 WIB`). Vercel otomatis mengirimkan header `Authorization: Bearer <CRON_SECRET>` bila `CRON_SECRET` diset di Environment Variables.

---

## Backup Database Neon & Ganti Password Admin

### Backup Database Neon
1. **Otomatis (Neon Point-in-Time Restore / Branching)**: Di dashboard Neon, Anda dapat membuat *branch* dari titik waktu tertentu sebelum perubahan besar.
2. **Manual (`pg_dump`)**: Gunakan `DIRECT_URL` (bukan pooled URL) untuk backup penuh:
```bash
pg_dump "$DIRECT_URL" --format=custom --no-owner -f "backup-kopi-nuri-$(date +%Y%m%d).dump"
```

### Cara Ganti Password Admin
Untuk mengganti password akun Admin di produksi secara aman (menggunakan `bcryptjs`):
```bash
node --env-file=.env -e '
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");
(async () => {
  const prisma = new PrismaClient();
  const newHash = await hash("PasswordBaruAdminKuat!", 12);
  await prisma.user.update({ where: { username: "admin" }, data: { passwordHash: newHash } });
  console.log("Password admin berhasil diperbarui.");
  await prisma.$disconnect();
})();
'
```

---

## Panduan Singkat Operasional (1 Halaman)

### Panduan Kasir
1. **Login**: Buka `/login`, masukkan username & password kasir.
2. **Catat Belanja & Tambah Poin (`/kasir`)**:
   - Pilih **Shift** aktif (`PAGI` 06–14, `SIANG` 14–22, `MALAM` 22–06).
   - Arahkan kursor ke kolom **Scan QR Member** lalu scan QR dari kartu/HP member (atau gunakan tombol **Scan dengan Kamera** / ketik kode `MBR-...` atau nomor HP).
   - Masukkan nominal belanja (Rp) → estimasi poin tampil otomatis → klik **Simpan Transaksi**.
3. **Tukar Reward (`/kasir/tukar`)**:
   - Scan QR member, pilih reward yang berstatus aktif dan poinnya cukup, lalu klik **Tukar** untuk menerbitkan kode voucher (`KN-XXXXXX`).
4. **Validasi Voucher (`/kasir/voucher`)**:
   - Scan atau masukkan kode voucher dari member → periksa detail hadiah → klik **Tandai Sudah Dipakai**. Voucher yang sudah dipakai tidak dapat digunakan ulang.

### Panduan Admin
1. **Dashboard (`/admin`)**: Pantau omzet & transaksi harian per shift, grafik 7 hari, top 5 member, aktivitas terbaru, dan status WhatsApp.
2. **Data Member (`/admin/member`)**: Cari, tambah, edit, cetak kartu QR member, atau nonaktifkan member.
3. **Katalog Reward (`/admin/reward`)**: Tambah/ubah hadiah, biaya poin, stok opsional, dan aktif/nonaktifkan reward.
4. **Riwayat & Koreksi Poin (`/admin/riwayat`)**: Lihat seluruh mutasi ledger dan lakukan koreksi poin (`ADJUST`) dengan alasan wajib.
5. **Laporan & Export (`/admin/laporan`)**: Filter tanggal & shift lalu unduh file CSV/Excel transaksi beserta ringkasan per shift.
6. **WhatsApp (`/admin/whatsapp`)**: Pantau log pengiriman pesan comeback, status `DRY RUN`, dan kirim pesan uji ke satu nomor.
7. **Pengaturan (`/admin/pengaturan`)**: Ubah aturan poin/level/WA serta tambah, nonaktifkan, atau reset password akun kasir.
