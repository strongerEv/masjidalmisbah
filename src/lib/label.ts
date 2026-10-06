import type { Donasi, Pengajuan, Penghitungan } from "./types";

type Tone = "green" | "amber" | "red" | "neutral" | "blue";

export const STATUS_HITUNG: Record<Penghitungan["status"], { label: string; tone: Tone }> = {
  menunggu: { label: "Menunggu saksi", tone: "amber" },
  terkonfirmasi: { label: "Terkonfirmasi", tone: "green" },
  dipersoalkan: { label: "Dipersoalkan", tone: "red" },
  dibatalkan: { label: "Dibatalkan", tone: "neutral" },
};

export const STATUS_DONASI: Record<Donasi["status"], { label: string; tone: Tone }> = {
  menunggu: { label: "Menunggu verifikasi", tone: "amber" },
  terverifikasi: { label: "Terverifikasi", tone: "green" },
  ditolak: { label: "Ditolak", tone: "red" },
};

export const STATUS_PENGAJUAN: Record<Pengajuan["status"], { label: string; tone: Tone }> = {
  menunggu: { label: "Menunggu Ketua", tone: "amber" },
  disetujui: { label: "Disetujui", tone: "blue" },
  ditolak: { label: "Ditolak", tone: "red" },
  selesai: { label: "Selesai", tone: "green" },
};
