const rupiahFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Rp1.500.000 (tanpa spasi, sesuai PRD). */
export function rupiah(n: number): string {
  const s = rupiahFmt.format(Math.abs(Math.round(n)));
  return (n < 0 ? "-Rp" : "Rp") + s;
}

/** 1500000 -> "1.500.000" untuk input nominal. */
export function ribuan(n: number | ""): string {
  if (n === "" || Number.isNaN(n)) return "";
  return rupiahFmt.format(n);
}

export function parseNominal(s: string): number {
  const digits = s.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function toDate(iso: string): Date {
  // YYYY-MM-DD diperlakukan sebagai tanggal lokal (bukan UTC)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return isoDate(new Date());
}

export function tanggal(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  return toDate(iso).toLocaleDateString("id-ID", opts);
}

export function tanggalPendek(iso: string): string {
  return tanggal(iso, { day: "numeric", month: "short", year: "numeric" });
}

export function hari(iso: string): string {
  return tanggal(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function waktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Tanggal Hijriah, contoh: "14 Rabiulakhir 1448 H". */
export function hijriah(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).formatToParts(toDate(iso));
    const d = parts.find((p) => p.type === "day")?.value ?? "";
    const m = parts.find((p) => p.type === "month")?.value ?? "";
    const y = (parts.find((p) => p.type === "year")?.value ?? "").replace(/\D/g, "");
    return `${d} ${m} ${y} H`;
  } catch {
    return "";
  }
}

export function bulanTahun(periode: string): string {
  const [y, m] = periode.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function periodeDari(iso: string): string {
  return iso.slice(0, 7);
}

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Jumat terakhir pada atau sebelum tanggal ini. */
export function jumatTerakhir(iso: string = today()): string {
  const d = toDate(iso);
  const diff = (d.getDay() - 5 + 7) % 7;
  d.setDate(d.getDate() - diff);
  return isoDate(d);
}

export function waLink(noWa: string, text: string): string {
  let n = noWa.replace(/[^\d]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function nomorKwitansi(id: string, createdAt: string): string {
  const d = new Date(createdAt);
  return `KW-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const JABATAN_LABEL: Record<string, string> = {
  ketua: "Ketua DKM",
  bendahara: "Bendahara",
  pengurus: "Pengurus",
};

export const PECAHAN = [100000, 50000, 20000, 10000, 5000, 2000, 1000] as const;
