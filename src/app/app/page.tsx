"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Box, ChevronRight, ClipboardCheck, FileText, HandHeart, Lock, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { daftarTindakan } from "@/lib/tindakan";
import { duaBelasBulan, rekapKotak, ringkasanPeriode, saldoKantong, saldoTotal } from "@/lib/logic";
import { hari, hijriah, jumatTerakhir, rupiah, tanggal, today } from "@/lib/format";
import { Badge, Card, SectionTitle, Stat, cx } from "@/components/ui";
import { BarChart } from "@/components/chart";

const IKON = { saksi: Box, persetujuan: ClipboardCheck, donasi: HandHeart, bayar: Wallet, rutin: Wallet };

export default function Beranda() {
  const { db, saya } = useStore();
  const now = today();
  const tindakan = daftarTindakan(db, saya);
  const bulan = ringkasanPeriode(db, now.slice(0, 8) + "01", now);
  const grafik = duaBelasBulan(db);
  const infak = rekapKotak(db, 10, jumatTerakhir(now));
  const kantong = [...db.kantong].filter((k) => k.aktif).sort((a, b) => a.urutan - b.urutan);
  const sapaan = new Date().getHours() < 11 ? "Selamat pagi" : new Date().getHours() < 15 ? "Selamat siang" : new Date().getHours() < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="space-y-8">
      <div>
        <div className="text-muted">
          {hari(now)} · {hijriah(now)}
        </div>
        <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight">
          {sapaan}, {saya!.nama.split(" ").slice(0, 2).join(" ")}
        </h1>
      </div>

      {/* Saldo */}
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-medium text-muted">Total saldo semua kantong</div>
              <div className="num mt-1 text-[2.2rem] font-bold leading-none tracking-tight">{rupiah(saldoTotal(db))}</div>
            </div>
            <Badge tone="gold">
              <Lock size={12} /> {db.tutup_buku.length} periode tutup buku
            </Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <Stat label="Pemasukan bulan ini" value={rupiah(bulan.masuk)} tone="masuk" />
            <Stat label="Pengeluaran bulan ini" value={rupiah(bulan.keluar)} tone="keluar" />
            <Stat label="Selisih" value={rupiah(bulan.masuk - bulan.keluar)} />
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-line border-t border-line sm:grid-cols-4 sm:divide-y-0">
          {kantong.map((k) => (
            <Link key={k.id} href={`/app/kas?kantong=${k.id}`} className="p-4 transition hover:bg-canvas">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-2">
                {k.nama}
                {k.jenis === "terikat" && <Lock size={12} className="text-gold" />}
              </div>
              <div className="num mt-0.5 font-bold">{rupiah(saldoKantong(db, k.id))}</div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Aksi cepat */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {bisa.catatKas(saya) && (
          <>
            <Aksi href="/app/kas/baru?arah=masuk" icon={<ArrowDownLeft />} label="Kas masuk" tone="masuk" />
            <Aksi href="/app/kas/baru?arah=keluar" icon={<ArrowUpRight />} label="Kas keluar" tone="keluar" />
            <Aksi href="/app/kotak-amal/hitung" icon={<Box />} label="Hitung kotak amal" />
          </>
        )}
        {!bisa.catatKas(saya) && <Aksi href="/app/pengajuan/baru" icon={<ClipboardCheck />} label="Ajukan kebutuhan dana" />}
        {!bisa.catatKas(saya) && <Aksi href="/app/kas" icon={<Wallet />} label="Lihat buku kas" />}
        {!bisa.catatKas(saya) && <Aksi href="/app/donasi" icon={<HandHeart />} label="Donasi masuk" />}
        <Aksi href="/app/laporan" icon={<FileText />} label="Laporan Jumat" />
      </div>

      {/* Perlu tindakan */}
      <section>
        <SectionTitle>Perlu tindakan Anda</SectionTitle>
        <Card>
          {tindakan.length === 0 ? (
            <div className="p-5 text-muted">Alhamdulillah, tidak ada yang menunggu tindakan Anda.</div>
          ) : (
            <div className="divide-y divide-line">
              {tindakan.map((t) => {
                const I = IKON[t.jenis];
                return (
                  <Link key={t.id} href={t.href} className="flex items-center gap-4 p-4 transition hover:bg-canvas">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold">
                      <I size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{t.judul}</div>
                      <div className="text-sm text-muted">{t.sub}</div>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionTitle>Pemasukan vs pengeluaran · 12 bulan</SectionTitle>
          <Card className="p-5">
            <BarChart
              data={grafik.map((g) => ({ label: g.label, values: [g.masuk, g.keluar] }))}
              series={[
                { name: "Pemasukan", color: "#1f8a6a" },
                { name: "Pengeluaran", color: "#d9c7a1" },
              ]}
            />
          </Card>
        </section>
        <section className="lg:col-span-2">
          <SectionTitle>Tren infak Jumat & kotak amal</SectionTitle>
          <Card className="p-5">
            <BarChart
              height={200}
              data={infak.map((w) => ({ label: `${Number(w.jumat.slice(8))}/${Number(w.jumat.slice(5, 7))}`, values: [w.total] }))}
              series={[{ name: "Total terkonfirmasi", color: "#b8892f" }]}
            />
          </Card>
        </section>
      </div>

      <section>
        <SectionTitle action={<Link href="/app/kas" className="text-sm font-semibold text-brand">Semua transaksi</Link>}>Transaksi terbaru</SectionTitle>
        <Card className="divide-y divide-line">
          {[...db.transaksi]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 6)
            .map((t) => (
              <Link key={t.id} href={`/app/kas/${t.id}`} className="flex items-center gap-4 p-4 hover:bg-canvas">
                <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.arah === "masuk" ? "bg-brand-soft text-masuk" : "bg-keluar-soft text-keluar")}>
                  {t.arah === "masuk" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.keterangan}</div>
                  <div className="text-sm text-muted">
                    {tanggal(t.tanggal, { day: "numeric", month: "short" })} · {db.kantong.find((k) => k.id === t.kantong_id)?.nama}
                  </div>
                </div>
                <div className={cx("num font-bold", t.arah === "masuk" ? "text-masuk" : "text-ink")}>
                  {t.arah === "masuk" ? "+" : "−"}
                  {rupiah(Math.abs(t.nominal))}
                </div>
              </Link>
            ))}
        </Card>
      </section>
    </div>
  );
}

function Aksi({ href, icon, label, tone }: { href: string; icon: React.ReactNode; label: string; tone?: "masuk" | "keluar" }) {
  return (
    <Link href={href} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 font-semibold transition hover:border-line-2 hover:shadow-sm">
      <span className={cx("flex h-10 w-10 items-center justify-center rounded-xl", tone === "masuk" ? "bg-brand-soft text-masuk" : tone === "keluar" ? "bg-keluar-soft text-keluar" : "bg-black/[0.04] text-ink-2")}>{icon}</span>
      {label}
    </Link>
  );
}
