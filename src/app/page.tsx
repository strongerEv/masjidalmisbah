"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Box, FileText, HandHeart, Lock, ShieldCheck, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildRingkasanPublik } from "@/lib/logic";
import { hijriah, rupiah, tanggal, today } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui";
import { Progress } from "@/components/chart";

export default function Beranda() {
  const { db } = useStore();
  const r = buildRingkasanPublik(db);
  const now = today();

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,#fbf6ea_0%,rgba(255,255,255,0)_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <Image src="/logo.png" alt="Logo Masjid Al Misbah" width={104} height={104} className="mx-auto rounded-[1.6rem] shadow-[0_12px_40px_-12px_rgba(15,92,70,0.35)]" priority />
            <div className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              {tanggal(now)} · {hijriah(now)}
            </div>
            <h1 className="mt-3 font-serif text-[2.6rem] font-bold leading-[1.1] tracking-tight sm:text-6xl">Amanah, terbuka, dan mudah berdonasi.</h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
              Setiap rupiah infak di Masjid Al Misbah tercatat lengkap dengan bukti dan saksi. Jamaah dapat melihat laporan kas kapan saja dan berdonasi lewat QRIS.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/donasi" size="lg">
                <HandHeart size={20} /> Donasi sekarang
              </Button>
              <Button href="/transparansi" size="lg" variant="secondary">
                Lihat laporan kas <ArrowRight size={18} />
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            <div className="bg-surface p-5 text-center">
              <div className="text-sm text-muted">Pemasukan bulan ini</div>
              <div className="num mt-1 text-xl font-bold text-masuk">{rupiah(r.bulan_ini.masuk)}</div>
            </div>
            <div className="bg-surface p-5 text-center">
              <div className="text-sm text-muted">Pengeluaran bulan ini</div>
              <div className="num mt-1 text-xl font-bold">{rupiah(r.bulan_ini.keluar)}</div>
            </div>
            <div className="bg-surface p-5 text-center">
              <div className="text-sm text-muted">Kantong dana</div>
              <div className="mt-1 text-xl font-bold">{r.kantong.length} terpisah</div>
            </div>
          </div>
        </div>
      </section>

      {/* Program */}
      {r.program.length > 0 && (
        <section className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-serif text-3xl font-bold">Program berjalan</h2>
              <Link href="/transparansi" className="font-semibold text-brand">
                Semua laporan
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {r.program.map((p) => (
                <div key={p.id} className="rounded-2xl border border-line bg-surface p-6">
                  <div className="text-lg font-bold">{p.nama}</div>
                  <p className="mt-1 text-muted">{p.deskripsi}</p>
                  <div className="mt-5">
                    <Progress value={p.terkumpul} max={p.target} />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-2">
                    <span>
                      <b className="num">{rupiah(p.terkumpul)}</b> <span className="text-muted">dari {rupiah(p.target)}</span>
                    </span>
                    <span className="text-muted">{p.donatur} donatur</span>
                  </div>
                  <Button href={`/donasi?program=${p.id}`} variant="secondary" className="mt-5 w-full">
                    Ikut berdonasi
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Prinsip */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="max-w-xl font-serif text-3xl font-bold">Kepercayaan jamaah adalah amanah utama kami</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, t: "Tidak ada yang dihapus", d: "Kesalahan diperbaiki dengan transaksi koreksi beralasan. Jejak audit selalu utuh." },
              { icon: Users, t: "Prinsip empat mata", d: "Kotak amal dihitung minimal dua orang; pengeluaran besar disetujui Ketua DKM." },
              { icon: Lock, t: "Dana terikat terjaga", d: "Dana pembangunan dan anak yatim tersimpan di kantong terpisah, tidak tercampur." },
              { icon: FileText, t: "Laporan setiap Jumat", d: "Laporan kas mingguan terbit otomatis dan bisa dilihat siapa saja." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-line p-5">
                <x.icon className="text-gold" />
                <div className="mt-4 font-bold">{x.t}</div>
                <p className="mt-1 text-muted">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-gold">
              <Box size={18} /> Untuk pengurus DKM
            </div>
            <h2 className="mt-2 font-serif text-3xl font-bold">Catat kas dari HP, kurang dari 30 detik.</h2>
            <p className="mt-2 max-w-xl text-muted">Kas masuk & keluar dengan foto nota, penghitungan kotak amal bersaksi, persetujuan pengeluaran, verifikasi donasi, dan tutup buku bulanan.</p>
          </div>
          <Button href="/masuk" variant="dark" size="lg">
            Masuk pengurus <ArrowRight size={18} />
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
