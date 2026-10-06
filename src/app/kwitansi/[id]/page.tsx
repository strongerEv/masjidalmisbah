"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Printer, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildKwitansi } from "@/lib/logic";
import { hijriah, rupiah, tanggal, waktu } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { Button, Card, Empty } from "@/components/ui";

const TERBILANG = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
function terbilang(n: number): string {
  n = Math.floor(n);
  if (n < 12) return TERBILANG[n];
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh " + terbilang(n % 10);
  if (n < 200) return "seratus " + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
  if (n < 2000) return "seribu " + terbilang(n - 1000);
  if (n < 1e6) return terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
  if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + " juta " + terbilang(n % 1e6);
  return terbilang(Math.floor(n / 1e9)) + " miliar " + terbilang(n % 1e9);
}

function Kwitansi() {
  const { id } = useParams<{ id: string }>();
  const baru = useSearchParams().get("baru");
  const { db } = useStore();
  const k = buildKwitansi(db, id);
  if (!k) return <Empty title="Kwitansi tidak ditemukan" />;

  if (k.status !== "terverifikasi") {
    return (
      <Card className="p-8 text-center">
        {k.status === "menunggu" ? <Clock size={44} className="mx-auto text-gold" /> : <XCircle size={44} className="mx-auto text-keluar" />}
        <h1 className="mt-4 font-serif text-3xl font-bold">{k.status === "menunggu" ? (baru ? "Jazakumullahu khairan!" : "Menunggu verifikasi") : "Donasi tidak dapat diverifikasi"}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          {k.status === "menunggu"
            ? `Bukti donasi ${rupiah(k.nominal)} untuk ${k.tujuan} sudah kami terima. Bendahara akan mencocokkan dengan mutasi rekening, lalu kwitansi digital dikirim ke WhatsApp Anda.`
            : `Alasan: ${k.alasan_tolak}. Silakan hubungi pengurus masjid.`}
        </p>
        <div className="mx-auto mt-6 max-w-xs rounded-xl bg-canvas p-4 text-sm">
          <div className="text-muted">Simpan link halaman ini untuk mengecek status</div>
          <div className="mt-1 font-mono font-semibold">{k.nomor}</div>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-line-2 p-4 text-left text-sm text-muted">
          <b className="text-ink-2">Mode demo:</b> masuk sebagai <Link href="/masuk?ke=/app/donasi" className="font-semibold text-brand">Bendahara (Pak Hasan)</Link> lalu buka menu Donasi untuk
          memverifikasi donasi ini.
        </div>
      </Card>
    );
  }

  return (
    <>
      {baru && (
        <div className="no-print mb-4 flex items-center gap-2 font-semibold text-masuk">
          <CheckCircle2 size={20} /> Donasi terverifikasi
        </div>
      )}
      <Card className="print-full overflow-hidden">
        <div className="h-1.5 bg-gold" />
        <div className="p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="" width={56} height={56} className="rounded-xl" />
              <div>
                <div className="font-serif text-xl font-bold">{k.masjid}</div>
                <div className="text-sm text-muted">{k.alamat}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-gold">Kwitansi</div>
              <div className="font-mono text-sm font-semibold">{k.nomor}</div>
            </div>
          </div>

          <div className="mt-8 space-y-4 border-y border-line py-6">
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <div className="text-muted">Telah terima dari</div>
              <div className="font-semibold">{k.nama_donatur}</div>
            </div>
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <div className="text-muted">Uang sejumlah</div>
              <div className="font-semibold capitalize italic">{terbilang(k.nominal).replace(/\s+/g, " ").trim()} rupiah</div>
            </div>
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <div className="text-muted">Untuk</div>
              <div className="font-semibold">Donasi {k.tujuan}</div>
            </div>
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <div className="text-muted">Tanggal</div>
              <div className="font-semibold">
                {tanggal(k.tanggal.slice(0, 10))} / {hijriah(k.tanggal.slice(0, 10))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="num rounded-xl bg-canvas px-5 py-3 text-3xl font-bold">{rupiah(k.nominal)}</div>
            <div className="text-right text-sm text-muted">
              Diverifikasi Bendahara DKM
              <div className="font-semibold text-ink">{waktu(k.tanggal)}</div>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-gold-soft p-5 text-center">
            <p className="font-serif text-lg italic leading-relaxed text-ink-2">
              “Ajarakallahu fiima a‘thaita, wa baaraka laka fiima abqaita, wa ja‘alahu laka thahuura.”
            </p>
            <p className="mt-2 text-sm text-muted">Semoga Allah memberi pahala atas apa yang engkau berikan, memberkahi harta yang tersisa, dan menjadikannya penyuci bagimu.</p>
          </div>
        </div>
      </Card>
      <div className="no-print mt-4 flex justify-center gap-3">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={18} /> Simpan PDF / cetak
        </Button>
        <Button href="/transparansi" variant="ghost">
          Lihat laporan kas
        </Button>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Suspense>
          <Kwitansi />
        </Suspense>
      </div>
    </PublicShell>
  );
}
