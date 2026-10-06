# Masjid Al Misbah — Keuangan & Donasi

Aplikasi web (mobile-first, bisa dipasang sebagai PWA) untuk pengurus Masjid Al Misbah: mencatat keuangan masjid secara amanah, menerima donasi jamaah lewat QRIS, dan menerbitkan laporan kas yang bisa dilihat jamaah kapan saja.

Dibangun dari PRD *Aplikasi Keuangan & Donasi Masjid Al Misbah*. Tampilannya putih dan bersih; hijau logo dipakai seperlunya sebagai aksen, dan emas untuk sorotan.

## Coba langsung

```bash
npm install
npm run dev
# buka http://localhost:3000
```

Aplikasi berjalan dalam **mode demo**: data contoh 12 bulan sudah terisi, dan semua perubahan tersimpan di browser (localStorage). Tidak perlu server atau database, jadi bisa langsung di-deploy ke Vercel.

Masuk lewat `/masuk`, lalu pilih salah satu akun demo:

| Akun | Jabatan | Yang bisa dicoba |
| --- | --- | --- |
| Pak Hasan | Bendahara | Catat kas, hitung kotak amal, verifikasi donasi, laporan, tutup buku |
| H. Abdul Rahman | Ketua DKM | Setujui/tolak pengajuan, kelola pengurus, jadi saksi |
| Ust. Ahmad Fauzi | Pengurus | Jadi saksi kotak amal, ajukan kebutuhan dana |

Login dengan nomor HP memakai OTP demo `123456`. Login dengan email menerima password apa saja.

## Fitur (sesuai PRD)

**Halaman publik (jamaah, tanpa akun)**
- `/` beranda: ringkasan bulan ini dan progres program donasi
- `/donasi`: pilih tujuan (kantong/program), nominal, nama atau "Hamba Allah", nomor WA, lalu bayar via QRIS statis dan unggah bukti (DON-01–03, DON-06)
- `/kwitansi/[id]`: status donasi dan kwitansi digital (dengan terbilang dan doa), bisa disimpan sebagai PDF (DON-05)
- `/transparansi`: saldo per kantong, pengeluaran besar, donasi terbaru, dan laporan Jumat terakhir (LAP-03)

**Aplikasi pengurus (`/app`)**
- **Beranda**: total saldo, saldo per kantong, daftar *Perlu tindakan*, grafik 12 bulan, dan tren infak Jumat (LAP-04)
- **Kas**: catat kas masuk/keluar; foto nota wajib untuk kas keluar; filter tanggal, kategori, kantong, dan pencatat; **koreksi** lewat transaksi pembalik (KAS-01–05). Transaksi tidak pernah dihapus.
- **Kotak Amal**: sesi hitung dengan rincian pecahan dan saksi. Saksi mengonfirmasi dari akunnya sendiri, dan transaksi baru tercatat setelah semua saksi setuju. Ada rekap per Jumat dan per kotak (AML-01–04).
- **Donasi**: verifikasi atau tolak dengan alasan, lalu kirim kwitansi ke WhatsApp. Ada juga poster QR siap cetak.
- **Pengajuan**: pengeluaran di atas batas (default Rp1.000.000) dan transfer antar kantong harus disetujui Ketua. Pengeluaran rutin cukup disetujui sekali (PGL-01–04, KTG-03).
- **Kantong Dana**: kantong terikat/bebas dengan saldo terpisah (KTG-01–04)
- **Laporan**: laporan Jumat dalam bentuk teks WhatsApp, gambar PNG siap tayang, atau PDF; laporan bulanan/tahunan dengan ekspor Excel (CSV); **tutup buku** yang mengunci periode (LAP-01, 02, 05)
- **Pengaturan**: profil masjid, QRIS, batas persetujuan, undang/cabut pengurus, kategori, program donasi, dan log aktivitas (AKN-02, 03, KAS-03, PRG-01–02)

Format Rupiah `Rp1.500.000`, tanggal Indonesia + Hijriah, huruf dan tombol besar, serta PWA (manifest + service worker).

## Struktur

```
src/app/            halaman (Next.js App Router)
src/components/     UI: tombol, form, modal, grafik, shell
src/lib/types.ts    model data (sama dengan skema SQL)
src/lib/logic.ts    perhitungan saldo, laporan, kwitansi
src/lib/store.tsx   penyimpanan data + aturan amanah (tanpa hapus, periode terkunci)
src/lib/seed.ts     data contoh
supabase/migrations skema Postgres + RLS untuk tahap berikutnya
```

## Deploy ke Vercel

1. Import repo ini di [vercel.com/new](https://vercel.com/new).
2. Framework terdeteksi otomatis sebagai Next.js; tidak perlu environment variable.
3. Deploy.

## Tahap berikutnya

- **Supabase**: `supabase/migrations/0001_skema.sql` sudah berisi tabel, Row Level Security per jabatan, trigger amanah (transaksi tidak bisa diubah/dihapus, periode terkunci, batas persetujuan, finalisasi saksi), serta fungsi publik `kirim_donasi` dan `kwitansi`. Semua akses data di aplikasi lewat `src/lib/store.tsx`, jadi yang perlu diganti hanya isi file itu.
- Payment gateway QRIS dinamis (DON-04), donatur tetap dengan pengingat WhatsApp (PRG-04–05), notifikasi push/WA, dan modul zakat, qurban, jadwal petugas, TPA, serta inventaris.

## Teknologi

Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript · lucide-react · qrcode
