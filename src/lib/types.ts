export type Jabatan = "ketua" | "bendahara" | "pengurus";
export type Arah = "masuk" | "keluar";

export interface Masjid {
  id: string;
  nama: string;
  alamat: string;
  rekening: string; // contoh: "BSI 7123456789 a.n. DKM Masjid Al Misbah"
  qris_statis: string | null; // URL gambar QRIS
  batas_persetujuan: number;
  tampilkan_saldo_publik: boolean;
}

export interface Pengurus {
  id: string;
  user_id: string | null;
  nama: string;
  no_hp: string;
  email: string;
  jabatan: Jabatan;
  aktif: boolean;
  created_at: string;
}

export interface Kantong {
  id: string;
  nama: string;
  jenis: "terikat" | "bebas";
  deskripsi: string;
  saldo_awal: number;
  aktif: boolean;
  urutan: number;
}

export interface Kategori {
  id: string;
  nama: string;
  arah: Arah;
  sistem: string | null; // kode kategori bawaan: infak_jumat, kotak_amal, donasi_qris, transfer
  aktif: boolean;
}

export type SumberTransaksi = "manual" | "donasi" | "kotak" | "pengajuan" | "transfer" | "koreksi";

export interface Transaksi {
  id: string;
  kantong_id: string;
  kategori_id: string;
  arah: Arah;
  tanggal: string; // YYYY-MM-DD
  nominal: number; // negatif hanya untuk transaksi pembalik (koreksi)
  keterangan: string;
  pihak: string; // nama donatur (masuk) atau penerima (keluar)
  bukti_url: string | null;
  sumber: SumberTransaksi;
  sumber_id: string | null;
  koreksi_dari: string | null;
  alasan_koreksi: string | null;
  dicatat_oleh: string;
  created_at: string;
}

export interface KotakAmal {
  id: string;
  nama: string;
  lokasi: string;
  kantong_id: string;
  kategori_id: string;
  aktif: boolean;
}

export interface Penghitungan {
  id: string;
  kotak_id: string;
  tanggal: string;
  rincian_pecahan: Record<string, number> | null;
  total: number;
  status: "menunggu" | "terkonfirmasi" | "dipersoalkan" | "dibatalkan";
  dicatat_oleh: string;
  transaksi_id: string | null;
  created_at: string;
}

export interface Saksi {
  id: string;
  penghitungan_id: string;
  pengurus_id: string;
  status: "menunggu" | "setuju" | "tidak_sesuai";
  catatan: string;
  waktu: string | null;
}

export interface Donasi {
  id: string;
  kantong_id: string;
  program_id: string | null;
  nama_donatur: string;
  anonim: boolean; // true = tampil "Hamba Allah" di halaman publik
  no_wa: string;
  nominal: number;
  metode: "qris_statis" | "gateway" | "tunai";
  bukti_url: string | null;
  status: "menunggu" | "terverifikasi" | "ditolak";
  alasan_tolak: string | null;
  doa: string;
  transaksi_id: string | null;
  diverifikasi_oleh: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  nama: string;
  deskripsi: string;
  foto_url: string | null;
  target: number;
  tenggat: string | null;
  kantong_id: string;
  aktif: boolean;
}

export interface Pengajuan {
  id: string;
  jenis: "pengeluaran" | "transfer";
  pengaju_id: string;
  tujuan: string;
  nominal: number;
  kantong_id: string;
  kantong_tujuan_id: string | null; // untuk transfer antar kantong
  kategori_id: string | null;
  lampiran_url: string | null;
  rutin: boolean; // pengeluaran rutin bulanan: sekali disetujui berlaku tiap bulan
  status: "menunggu" | "disetujui" | "ditolak" | "selesai";
  alasan: string | null; // alasan penolakan
  disetujui_oleh: string | null;
  waktu_keputusan: string | null;
  created_at: string;
}

export interface TutupBuku {
  id: string;
  periode: string; // YYYY-MM
  saldo_catatan: number;
  saldo_riil: number;
  catatan: string;
  ditutup_oleh: string;
  created_at: string;
}

export interface LogAktivitas {
  id: string;
  pengurus_id: string;
  aksi: string;
  entitas: string;
  entitas_id: string | null;
  waktu: string;
}

export interface DB {
  masjid: Masjid;
  pengurus: Pengurus[];
  kantong: Kantong[];
  kategori: Kategori[];
  transaksi: Transaksi[];
  kotak: KotakAmal[];
  penghitungan: Penghitungan[];
  saksi: Saksi[];
  donasi: Donasi[];
  program: Program[];
  pengajuan: Pengajuan[];
  tutup_buku: TutupBuku[];
  log_aktivitas: LogAktivitas[];
}

export type TableName = Exclude<keyof DB, "masjid">;
export type Row<T extends TableName> = DB[T][number];

/** Ringkasan yang boleh dilihat publik (jamaah). */
export interface RingkasanPublik {
  masjid: Pick<Masjid, "nama" | "alamat" | "rekening" | "qris_statis" | "tampilkan_saldo_publik">;
  kantong: { id: string; nama: string; jenis: Kantong["jenis"]; deskripsi: string; saldo: number | null }[];
  bulan_ini: { masuk: number; keluar: number };
  pengeluaran_besar: { tanggal: string; keterangan: string; kategori: string; nominal: number }[];
  program: { id: string; nama: string; deskripsi: string; target: number; terkumpul: number; donatur: number; tenggat: string | null; kantong_id: string }[];
  donasi_terbaru: { nama: string; nominal: number; tanggal: string; tujuan: string }[];
}

export interface Kwitansi {
  id: string;
  nomor: string;
  nama_donatur: string;
  nominal: number;
  tujuan: string;
  status: Donasi["status"];
  alasan_tolak: string | null;
  tanggal: string;
  masjid: string;
  alamat: string;
}

export interface DonasiBaru {
  kantong_id: string;
  program_id: string | null;
  nama_donatur: string;
  anonim: boolean;
  no_wa: string;
  nominal: number;
  doa: string;
  bukti: Blob | null;
}
