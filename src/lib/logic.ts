import type { DB, Donasi, Kantong, Kwitansi, Pengajuan, RingkasanPublik, Transaksi } from "./types";
import { addDays, bulanTahun, hari, hijriah, isoDate, nomorKwitansi, periodeDari, rupiah, tanggal, toDate, today, uid } from "./format";

/** Efek transaksi terhadap saldo kantong (masuk +, keluar −). */
export function efek(t: Pick<Transaksi, "arah" | "nominal">): number {
  return t.arah === "masuk" ? t.nominal : -t.nominal;
}

export function saldoKantong(db: DB, kantongId: string, sampai?: string): number {
  const k = db.kantong.find((x) => x.id === kantongId);
  let s = k?.saldo_awal ?? 0;
  for (const t of db.transaksi) {
    if (t.kantong_id !== kantongId) continue;
    if (sampai && t.tanggal > sampai) continue;
    s += efek(t);
  }
  return s;
}

export function saldoTotal(db: DB, sampai?: string): number {
  return db.kantong.reduce((acc, k) => acc + saldoKantong(db, k.id, sampai), 0);
}

export function periodeTerkunci(db: DB, tgl: string): boolean {
  const p = periodeDari(tgl);
  return db.tutup_buku.some((b) => b.periode === p);
}

/** Transaksi yang sudah dikoreksi/dibatalkan (punya transaksi pembalik). */
export function sudahDikoreksi(db: DB, id: string): boolean {
  return db.transaksi.some((t) => t.koreksi_dari === id && t.nominal < 0);
}

export function kategoriSistem(db: DB, kode: string) {
  return db.kategori.find((k) => k.sistem === kode);
}

export interface BarisKantong {
  kantong: Kantong;
  awal: number;
  masuk: number;
  keluar: number;
  akhir: number;
}

export interface Ringkasan {
  dari: string;
  sampai: string;
  baris: BarisKantong[];
  masuk: number; // tanpa transfer antar kantong
  keluar: number;
  awal: number;
  akhir: number;
}

export function ringkasanPeriode(db: DB, dari: string, sampai: string): Ringkasan {
  const baris: BarisKantong[] = db.kantong
    .filter((k) => k.aktif || saldoKantong(db, k.id) !== 0)
    .sort((a, b) => a.urutan - b.urutan)
    .map((k) => {
      const awal = saldoKantong(db, k.id, addDays(dari, -1));
      let masuk = 0;
      let keluar = 0;
      for (const t of db.transaksi) {
        if (t.kantong_id !== k.id || t.tanggal < dari || t.tanggal > sampai) continue;
        if (t.arah === "masuk") masuk += t.nominal;
        else keluar += t.nominal;
      }
      return { kantong: k, awal, masuk, keluar, akhir: awal + masuk - keluar };
    });
  let masuk = 0;
  let keluar = 0;
  for (const t of db.transaksi) {
    if (t.tanggal < dari || t.tanggal > sampai || t.sumber === "transfer") continue;
    if (t.arah === "masuk") masuk += t.nominal;
    else keluar += t.nominal;
  }
  return {
    dari,
    sampai,
    baris,
    masuk,
    keluar,
    awal: baris.reduce((a, b) => a + b.awal, 0),
    akhir: baris.reduce((a, b) => a + b.akhir, 0),
  };
}

export function perKategori(db: DB, dari: string, sampai: string) {
  const map = new Map<string, { nama: string; arah: string; total: number; jumlah: number }>();
  for (const t of db.transaksi) {
    if (t.tanggal < dari || t.tanggal > sampai || t.sumber === "transfer") continue;
    const kat = db.kategori.find((k) => k.id === t.kategori_id);
    const key = t.kategori_id;
    const cur = map.get(key) ?? { nama: kat?.nama ?? "Lainnya", arah: t.arah, total: 0, jumlah: 0 };
    cur.total += t.nominal;
    cur.jumlah += t.nominal > 0 ? 1 : -1;
    map.set(key, cur);
  }
  const rows = [...map.values()].filter((r) => r.total !== 0).sort((a, b) => b.total - a.total);
  return { masuk: rows.filter((r) => r.arah === "masuk"), keluar: rows.filter((r) => r.arah === "keluar") };
}

/** 12 bulan terakhir pemasukan vs pengeluaran (tanpa transfer). */
export function duaBelasBulan(db: DB, akhir: string = today()) {
  const end = toDate(akhir);
  const out: { periode: string; label: string; masuk: number; keluar: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const p = isoDate(d).slice(0, 7);
    out.push({ periode: p, label: d.toLocaleDateString("id-ID", { month: "short" }), masuk: 0, keluar: 0 });
  }
  for (const t of db.transaksi) {
    if (t.sumber === "transfer") continue;
    const row = out.find((r) => r.periode === periodeDari(t.tanggal));
    if (!row) continue;
    if (t.arah === "masuk") row.masuk += t.nominal;
    else row.keluar += t.nominal;
  }
  return out;
}

/** Rekap kotak amal terkonfirmasi per Jumat (minggu Sabtu–Jumat) dan per kotak. */
export function rekapKotak(db: DB, jumlahPekan = 8, jumat: string) {
  const pekan: { jumat: string; total: number; perKotak: Record<string, number> }[] = [];
  for (let i = jumlahPekan - 1; i >= 0; i--) {
    pekan.push({ jumat: addDays(jumat, -7 * i), total: 0, perKotak: {} });
  }
  for (const p of db.penghitungan) {
    if (p.status !== "terkonfirmasi") continue;
    const row = pekan.find((w) => p.tanggal > addDays(w.jumat, -7) && p.tanggal <= w.jumat);
    if (!row) continue;
    row.total += p.total;
    row.perKotak[p.kotak_id] = (row.perKotak[p.kotak_id] ?? 0) + p.total;
  }
  return pekan;
}

export function laporanJumat(db: DB, jumat: string) {
  const dari = addDays(jumat, -6);
  const r = ringkasanPeriode(db, dari, jumat);
  const kat = perKategori(db, dari, jumat);
  const kotak = db.penghitungan
    .filter((p) => p.status === "terkonfirmasi" && p.tanggal >= dari && p.tanggal <= jumat)
    .reduce((a, p) => a + p.total, 0);
  return { ...r, kategori: kat, kotak };
}

export function teksLaporanJumat(db: DB, jumat: string): string {
  const l = laporanJumat(db, jumat);
  const lines: string[] = [];
  lines.push(`*LAPORAN KAS ${db.masjid.nama.toUpperCase()}*`);
  lines.push(`${hari(jumat)} / ${hijriah(jumat)}`);
  lines.push(`Periode ${tanggal(l.dari, { day: "numeric", month: "short" })} – ${tanggal(jumat, { day: "numeric", month: "short", year: "numeric" })}`);
  lines.push("");
  lines.push(`Saldo pekan lalu: ${rupiah(l.awal)}`);
  lines.push(`Pemasukan: ${rupiah(l.masuk)}`);
  for (const k of l.kategori.masuk) lines.push(`  • ${k.nama}: ${rupiah(k.total)}`);
  lines.push(`Pengeluaran: ${rupiah(l.keluar)}`);
  for (const k of l.kategori.keluar) lines.push(`  • ${k.nama}: ${rupiah(k.total)}`);
  lines.push(`*Saldo akhir: ${rupiah(l.akhir)}*`);
  lines.push("");
  lines.push("_Saldo per kantong dana:_");
  for (const b of l.baris) lines.push(`  • ${b.kantong.nama}: ${rupiah(b.akhir)}`);
  lines.push("");
  lines.push("Jazakumullahu khairan kepada seluruh jamaah atas infak dan sedekahnya.");
  lines.push("Semoga Allah membalas dengan pahala berlipat ganda. Aamiin.");
  return lines.join("\n");
}

export function buildRingkasanPublik(db: DB): RingkasanPublik {
  const now = today();
  const awalBulan = now.slice(0, 8) + "01";
  const r = ringkasanPeriode(db, awalBulan, now);
  const kat = (id: string) => db.kategori.find((k) => k.id === id)?.nama ?? "";
  const kantongNama = (id: string) => db.kantong.find((k) => k.id === id)?.nama ?? "";
  const pengeluaran_besar = db.transaksi
    .filter((t) => t.arah === "keluar" && t.sumber !== "transfer" && t.nominal >= db.masjid.batas_persetujuan && !sudahDikoreksi(db, t.id))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 8)
    .map((t) => ({ tanggal: t.tanggal, keterangan: t.keterangan, kategori: kat(t.kategori_id), nominal: t.nominal }));
  const program = db.program
    .filter((p) => p.aktif)
    .map((p) => {
      const ds = db.donasi.filter((d) => d.program_id === p.id && d.status === "terverifikasi");
      return {
        id: p.id,
        nama: p.nama,
        deskripsi: p.deskripsi,
        target: p.target,
        terkumpul: ds.reduce((a, d) => a + d.nominal, 0),
        donatur: ds.length,
        tenggat: p.tenggat,
        kantong_id: p.kantong_id,
      };
    });
  const donasi_terbaru = db.donasi
    .filter((d) => d.status === "terverifikasi")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .map((d) => ({
      nama: d.anonim ? "Hamba Allah" : d.nama_donatur || "Hamba Allah",
      nominal: d.nominal,
      tanggal: d.created_at.slice(0, 10),
      tujuan: d.program_id ? db.program.find((p) => p.id === d.program_id)?.nama ?? "" : kantongNama(d.kantong_id),
    }));
  return {
    masjid: {
      nama: db.masjid.nama,
      alamat: db.masjid.alamat,
      rekening: db.masjid.rekening,
      qris_statis: db.masjid.qris_statis,
      tampilkan_saldo_publik: db.masjid.tampilkan_saldo_publik,
    },
    kantong: db.kantong
      .filter((k) => k.aktif)
      .sort((a, b) => a.urutan - b.urutan)
      .map((k) => ({ id: k.id, nama: k.nama, jenis: k.jenis, deskripsi: k.deskripsi, saldo: db.masjid.tampilkan_saldo_publik ? saldoKantong(db, k.id) : null })),
    bulan_ini: { masuk: r.masuk, keluar: r.keluar },
    pengeluaran_besar,
    program,
    donasi_terbaru,
  };
}

export function buildKwitansi(db: DB, id: string): Kwitansi | null {
  const d = db.donasi.find((x) => x.id === id);
  if (!d) return null;
  const tujuan = d.program_id
    ? db.program.find((p) => p.id === d.program_id)?.nama ?? ""
    : db.kantong.find((k) => k.id === d.kantong_id)?.nama ?? "";
  return {
    id: d.id,
    nomor: nomorKwitansi(d.id, d.created_at),
    nama_donatur: d.nama_donatur || "Hamba Allah",
    nominal: d.nominal,
    tujuan,
    status: d.status,
    alasan_tolak: d.alasan_tolak,
    tanggal: d.created_at,
    masjid: db.masjid.nama,
    alamat: db.masjid.alamat,
  };
}

/**
 * Bila semua saksi sudah setuju, kembalikan transaksi yang harus dibuat
 * beserta perubahan status penghitungan. Dipakai mode demo; di Supabase
 * logika yang sama ada di fungsi SQL `finalisasi_penghitungan`.
 */
export function finalisasiPenghitungan(db: DB, penghitunganId: string): Transaksi | null {
  const p = db.penghitungan.find((x) => x.id === penghitunganId);
  if (!p || p.status !== "menunggu" || p.transaksi_id) return null;
  const saksi = db.saksi.filter((s) => s.penghitungan_id === p.id);
  if (saksi.length === 0 || saksi.some((s) => s.status !== "setuju")) return null;
  const kotak = db.kotak.find((k) => k.id === p.kotak_id);
  if (!kotak) return null;
  return {
    id: uid(),
    kantong_id: kotak.kantong_id,
    kategori_id: kotak.kategori_id,
    arah: "masuk",
    tanggal: p.tanggal,
    nominal: p.total,
    keterangan: `Penghitungan ${kotak.nama}`,
    pihak: "Jamaah",
    bukti_url: null,
    sumber: "kotak",
    sumber_id: p.id,
    koreksi_dari: null,
    alasan_koreksi: null,
    dicatat_oleh: p.dicatat_oleh,
    created_at: new Date().toISOString(),
  };
}

/** Pengajuan rutin yang disetujui dan belum dibayar bulan ini. */
export function rutinBelumDibayar(db: DB, periode: string): Pengajuan[] {
  return db.pengajuan.filter(
    (p) =>
      p.rutin &&
      p.status === "disetujui" &&
      !db.transaksi.some((t) => t.sumber === "pengajuan" && t.sumber_id === p.id && periodeDari(t.tanggal) === periode && t.nominal > 0 && !sudahDikoreksi(db, t.id)),
  );
}

export function labelPeriode(dari: string, sampai: string): string {
  if (dari.slice(0, 7) === sampai.slice(0, 7) && dari.endsWith("-01")) return bulanTahun(dari.slice(0, 7));
  return `${tanggal(dari)} – ${tanggal(sampai)}`;
}

export function pesanKwitansi(d: Pick<Donasi, "id" | "nama_donatur" | "nominal" | "created_at">, masjid: string, url: string) {
  return [
    `Assalamu'alaikum ${d.nama_donatur || "Bapak/Ibu"},`,
    "",
    `Jazakumullahu khairan. Donasi Anda sebesar *${rupiah(d.nominal)}* untuk ${masjid} telah kami terima.`,
    "",
    `Kwitansi digital (${nomorKwitansi(d.id, d.created_at)}):`,
    url,
    "",
    "Ajarakallahu fiima a'thaita, wa baaraka laka fiima abqaita, wa ja'alahu laka thahuura.",
    "(Semoga Allah memberi pahala atas apa yang engkau berikan, memberkahi harta yang tersisa, dan menjadikannya penyuci bagimu.)",
  ].join("\n");
}

