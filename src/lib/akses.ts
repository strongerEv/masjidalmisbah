import type { Pengurus } from "./types";

/** Hak akses per jabatan DKM (lihat PRD bagian "Pengguna & Peran"). */
export const bisa = {
  catatKas: (p: Pengurus | null) => p?.jabatan === "bendahara",
  verifikasiDonasi: (p: Pengurus | null) => p?.jabatan === "bendahara" || p?.jabatan === "ketua",
  lihatDataDonatur: (p: Pengurus | null) => p?.jabatan === "bendahara" || p?.jabatan === "ketua",
  setujui: (p: Pengurus | null) => p?.jabatan === "ketua",
  ajukan: (p: Pengurus | null) => !!p,
  kelolaPengurus: (p: Pengurus | null) => p?.jabatan === "ketua",
  kelolaMaster: (p: Pengurus | null) => p?.jabatan === "bendahara" || p?.jabatan === "ketua",
  tutupBuku: (p: Pengurus | null) => p?.jabatan === "bendahara",
  hitungKotak: (p: Pengurus | null) => p?.jabatan === "bendahara",
};
