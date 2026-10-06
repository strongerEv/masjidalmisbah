import type { DB } from "./types";
import { laporanJumat } from "./logic";
import { hari, hijriah, rupiah, tanggal } from "./format";

function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

/** Laporan Jumat sebagai gambar 1080×1350 siap tayang / kirim ke grup WhatsApp. */
export async function gambarLaporanJumat(db: DB, jumat: string): Promise<string> {
  const l = laporanJumat(db, jumat);
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  await document.fonts?.ready;
  const sans = getComputedStyle(document.body).fontFamily || "sans-serif";
  const f = (w: number, s: number) => `${w} ${s}px ${sans}`;

  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, W, H);
  // garis emas tipis di atas
  x.fillStyle = "#b8892f";
  x.fillRect(0, 0, W, 10);

  try {
    const logo = await muatGambar("/logo.png");
    x.drawImage(logo, 80, 80, 120, 120);
  } catch {
    /* tanpa logo */
  }
  x.fillStyle = "#b8892f";
  x.font = f(700, 26);
  x.fillText("LAPORAN KAS JUMAT", 230, 118);
  x.fillStyle = "#1b1f1d";
  x.font = `700 52px ${getComputedStyle(document.documentElement).getPropertyValue("--font-lora") || "serif"}, serif`;
  x.fillText(db.masjid.nama, 230, 175);
  x.fillStyle = "#6e7571";
  x.font = f(500, 28);
  x.fillText(`${hari(jumat)} · ${hijriah(jumat)}`, 80, 265);

  // kartu ringkasan
  const kartu = (y: number, label: string, nilai: string, warna = "#1b1f1d") => {
    x.fillStyle = "#6e7571";
    x.font = f(500, 30);
    x.fillText(label, 80, y);
    x.fillStyle = warna;
    x.font = f(700, 34);
    const w = x.measureText(nilai).width;
    x.fillText(nilai, W - 80 - w, y);
  };
  x.strokeStyle = "#ebecea";
  x.lineWidth = 2;
  const garis = (y: number) => {
    x.beginPath();
    x.moveTo(80, y);
    x.lineTo(W - 80, y);
    x.stroke();
  };
  garis(310);
  kartu(375, "Saldo pekan lalu", rupiah(l.awal));
  kartu(440, "Pemasukan", "+" + rupiah(l.masuk), "#137257");
  kartu(505, "Pengeluaran", "−" + rupiah(l.keluar), "#b4472e");
  garis(545);
  x.fillStyle = "#1b1f1d";
  x.font = f(700, 34);
  x.fillText("Saldo akhir", 80, 615);
  x.font = f(800, 60);
  const sa = rupiah(l.akhir);
  x.fillText(sa, W - 80 - x.measureText(sa).width, 620);

  // per kantong
  x.fillStyle = "#fafaf8";
  const top = 690;
  const tinggi = 70 + l.baris.length * 62;
  x.beginPath();
  x.roundRect(60, top, W - 120, tinggi, 28);
  x.fill();
  x.fillStyle = "#6e7571";
  x.font = f(700, 24);
  x.fillText("SALDO PER KANTONG DANA", 100, top + 52);
  l.baris.forEach((b, i) => {
    const y = top + 110 + i * 62;
    x.fillStyle = "#1b1f1d";
    x.font = f(600, 30);
    x.fillText(b.kantong.nama + (b.kantong.jenis === "terikat" ? "  •" : ""), 100, y);
    x.font = f(700, 30);
    const v = rupiah(b.akhir);
    x.fillText(v, W - 100 - x.measureText(v).width, y);
  });

  x.fillStyle = "#6e7571";
  x.font = f(500, 24);
  x.fillText(`Periode ${tanggal(l.dari, { day: "numeric", month: "short" })} – ${tanggal(jumat)}  ·  • = dana terikat`, 80, H - 150);
  x.fillStyle = "#1b1f1d";
  x.font = f(600, 26);
  x.fillText("Jazakumullahu khairan atas infak dan sedekah jamaah.", 80, H - 100);
  x.fillStyle = "#b8892f";
  x.fillRect(0, H - 10, W, 10);
  return c.toDataURL("image/png");
}
