# Segar Sari — Aplikasi Web Katalog, Pemesanan & Dashboard Admin

Aplikasi web full-stack untuk UMKM **Segar Sari** (jus buah segar alami). Dibangun dengan React, Vite, Tailwind CSS, Express API, PostgreSQL (Cloud SQL + Drizzle ORM, serta migrasi siap pakai untuk Supabase), Firebase Authentication untuk proteksi admin, dan integrasi analisis foto Gemini (`gemini-4-hydrogen` — **kompatibel dengan API Key gratis AI Studio**).

## Fitur Utama

### Publik (Pelanggan)
- **Beranda & Katalog Menu (`/`, `/katalog`)**: Menampilkan 12 menu resmi (*Jus Buah Tunggal*, *Jus Mix*, dan *Paket*) lengkap dengan pencarian dan filter kategori.
- **Detail Produk (`/produk/:slug`)**: Informasi lengkap, stok, pengatur jumlah, serta produk terkait.
- **Keranjang Persisten (`/keranjang` & Drawer)**: Tersimpan otomatis di browser dan disinkronkan dengan katalog aktif.
- **Checkout Tervalidasi (`/checkout`)**: Menggunakan `idempotencyKey`, validasi stok & kalkulasi total harga di server secara atomik, menghasilkan nomor pesanan unik (`SS-YYYYMMDD-XXXXXX`), serta tautan konfirmasi pesanan WhatsApp langsung ke nomor toko.
- **Analisis Foto Buah AI (`/analisis-foto`)**: Pelanggan dapat mengunggah foto buah/minuman (JPEG, PNG, WebP) untuk mendapatkan analisis kesegaran, profil rasa, manfaat nutrisi, dan rekomendasi menu Segar Sari via `gemini-4-hydrogen` di server.

### Admin Dashboard (`/admin`)
- **Proteksi Autentikasi & RBAC**: Menggunakan Google Sign-In (Firebase Auth) yang diverifikasi di backend (`requireAuth` + `requireAdmin`) berdasarkan tabel `users` dan daftar email admin (`ADMIN_EMAILS`). Tidak ada pendaftaran admin publik.
- **Ringkasan Penjualan**: Total produk, total pesanan, pesanan baru, omzet selesai, dan tabel pesanan terbaru.
- **Manajemen Produk (CRUD)**: Tambah, ubah, hapus (dengan konfirmasi), kontrol stok & ketersediaan, unggah gambar terverifikasi (MIME + *magic-byte signature*), serta tombol bantu **Isi Otomatis dari Foto (Gemini AI)**.
- **Manajemen Pesanan**: Filter status, pencarian nama/nomor pesanan, filter tanggal, detail item snapshot, dan pembaruan status (*Menunggu konfirmasi*, *Diproses*, *Siap diambil atau dikirim*, *Selesai*, *Dibatalkan* dengan pengembalian stok otomatis).
- **Pengaturan Toko & Audit Log**: Edit profil toko, nomor WhatsApp, jam buka, alamat, media sosial, gambar banner/logo, serta log aktivitas keamanan admin.

---

## Arsitektur Keamanan
1. **API Key Server-Side**: `GEMINI_API_KEY` dan kredensial database hanya diakses dari server (`server.ts` / `src/server/*`), tidak pernah dikirim ke browser.
2. **Server-Side Checkout & Transaksi Atomik**: Harga satuan dan total belanja selalu diambil dari database saat transaksi (`db.transaction`), bukan dari payload klien.
3. **Validasi Input & Upload**: Seluruh payload divalidasi dengan `zod`; unggahan file diperiksa *magic bytes* (JPEG `FFD8FF`, PNG `89504E47`, WebP `RIFF..WEBP`), dibatasi maksimal 3 MB, dan disimpan dengan nama acak UUID.
4. **Rate Limiting & Security Headers**: Pembatasan frekuensi request pada checkout, upload/analisis AI, dan endpoint admin, dilengkapi `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, dan `Content-Security-Policy`.
5. **Anti-XSS & Parameterized Queries**: Seluruh query database menggunakan Drizzle ORM terparameterisasi dan tampilan React bebas injeksi HTML mentah.

---

## Cara Menjalankan Lokal
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Atur variabel lingkungan (atau panel **Settings > Secrets** di AI Studio):
   - `GEMINI_API_KEY`: API key dari Google AI Studio (bisa menggunakan **Free Tier** karena model yang dipakai adalah `gemini-4-hydrogen`).
   - `ADMIN_EMAILS`: Email Google yang diizinkan mengakses `/admin` (dipisahkan koma jika lebih dari satu).
   - Kredensial PostgreSQL Cloud SQL (`SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`).
3. Dorong skema database:
   ```bash
   npx drizzle-kit push --config=src/db/drizzle.config.ts
   ```
4. Jalankan server pengembangan (port `3000`):
   ```bash
   npm run dev
   ```

---

## Panduan Deploy ke GitHub & Vercel
1. **Push ke GitHub**:
   - Pastikan file `.env*` dan folder `uploads/` tetap diabaikan oleh `.gitignore`.
   - Commit dan push repositori ke GitHub Anda.
2. **Siapkan Database PostgreSQL (Supabase / Cloud SQL)**:
   - Jika menggunakan Supabase, jalankan skema dan kebijakan RLS pada `supabase/migrations/001_initial_schema.sql` dan `supabase/seed.sql` melalui SQL Editor Supabase.
3. **Deploy di Vercel**:
   - Hubungkan repositori GitHub di dashboard Vercel.
   - Tambahkan Environment Variables di Vercel (`GEMINI_API_KEY` dari Google AI Studio Free Tier, `ADMIN_EMAILS`, serta kredensial database).
   - Build Command: `npm run build` · Start Command: `npm run start`.
4. **Backup & Pemulihan**:
   - Aktifkan backup otomatis harian pada instance Cloud SQL / Supabase dan lakukan uji *restore* secara berkala.
   - Jika terjadi insiden kebocoran kunci, segera lakukan rotasi `GEMINI_API_KEY` dan periksa tabel `audit_logs` di `/admin`.
