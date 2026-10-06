import type { DB, Pengurus } from "./types";
import { bisa } from "./akses";
import { rupiah, tanggalPendek, today } from "./format";
import { rutinBelumDibayar } from "./logic";

export interface Tindakan {
  id: string;
  jenis: "saksi" | "persetujuan" | "donasi" | "bayar" | "rutin";
  judul: string;
  sub: string;
  href: string;
}

/** Daftar hal yang menunggu tindakan pengurus yang sedang masuk (pengganti notifikasi). */
export function daftarTindakan(db: DB, saya: Pengurus | null): Tindakan[] {
  if (!saya) return [];
  const out: Tindakan[] = [];
  for (const s of db.saksi) {
    if (s.pengurus_id !== saya.id || s.status !== "menunggu") continue;
    const p = db.penghitungan.find((x) => x.id === s.penghitungan_id);
    if (!p || p.status !== "menunggu") continue;
    const k = db.kotak.find((x) => x.id === p.kotak_id);
    out.push({ id: s.id, jenis: "saksi", judul: `Konfirmasi hitungan ${k?.nama ?? "kotak amal"}`, sub: `${rupiah(p.total)} · ${tanggalPendek(p.tanggal)}`, href: `/app/kotak-amal/${p.id}` });
  }
  if (bisa.setujui(saya)) {
    for (const a of db.pengajuan.filter((x) => x.status === "menunggu")) {
      out.push({ id: a.id, jenis: "persetujuan", judul: a.jenis === "transfer" ? `Transfer antar kantong: ${a.tujuan}` : a.tujuan, sub: `${rupiah(a.nominal)} · menunggu persetujuan Anda`, href: `/app/pengajuan/${a.id}` });
    }
  }
  if (bisa.verifikasiDonasi(saya)) {
    const n = db.donasi.filter((d) => d.status === "menunggu");
    if (n.length) out.push({ id: "donasi", jenis: "donasi", judul: `${n.length} donasi QRIS menunggu verifikasi`, sub: `Total ${rupiah(n.reduce((a, d) => a + d.nominal, 0))}`, href: "/app/donasi" });
  }
  if (bisa.catatKas(saya)) {
    for (const a of db.pengajuan.filter((x) => x.status === "disetujui" && !x.rutin && x.jenis === "pengeluaran")) {
      out.push({ id: a.id, jenis: "bayar", judul: `Bayar & unggah nota: ${a.tujuan}`, sub: `${rupiah(a.nominal)} · sudah disetujui Ketua`, href: `/app/pengajuan/${a.id}` });
    }
    for (const a of rutinBelumDibayar(db, today().slice(0, 7))) {
      out.push({ id: "rutin-" + a.id, jenis: "rutin", judul: `Pengeluaran rutin: ${a.tujuan}`, sub: `Belum dicatat bulan ini · maks ${rupiah(a.nominal)}`, href: `/app/kas/baru?arah=keluar&rutin=${a.id}` });
    }
  }
  return out;
}
