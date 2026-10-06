"use client";

import { HandHeart, Lock } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildRingkasanPublik, teksLaporanJumat } from "@/lib/logic";
import { bulanTahun, hijriah, jumatTerakhir, rupiah, tanggal, today } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { Button, Card, SectionTitle } from "@/components/ui";
import { Progress } from "@/components/chart";

export default function Transparansi() {
  const { db } = useStore();
  const r = buildRingkasanPublik(db);
  const now = today();
  const jumat = jumatTerakhir(now);
  const total = r.kantong.reduce((a, k) => a + (k.saldo ?? 0), 0);

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Transparansi</div>
          <h1 className="mt-2 font-serif text-4xl font-bold">Laporan kas {db.masjid.nama}</h1>
          <p className="mt-2 text-muted">
            Diperbarui otomatis dari catatan bendahara · {tanggal(now)} / {hijriah(now)}
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-muted">Pemasukan {bulanTahun(now.slice(0, 7))}</div>
            <div className="num mt-1 text-2xl font-bold text-masuk">{rupiah(r.bulan_ini.masuk)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-muted">Pengeluaran {bulanTahun(now.slice(0, 7))}</div>
            <div className="num mt-1 text-2xl font-bold">{rupiah(r.bulan_ini.keluar)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-muted">{r.masjid.tampilkan_saldo_publik ? "Total saldo" : "Selisih bulan ini"}</div>
            <div className="num mt-1 text-2xl font-bold">{rupiah(r.masjid.tampilkan_saldo_publik ? total : r.bulan_ini.masuk - r.bulan_ini.keluar)}</div>
          </Card>
        </section>

        <section>
          <SectionTitle>Kantong dana</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.kantong.map((k) => (
              <Card key={k.id} className="flex items-start justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-1.5 font-bold">
                    {k.nama} {k.jenis === "terikat" && <Lock size={14} className="text-gold" />}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">{k.deskripsi}</div>
                </div>
                {k.saldo !== null && <div className="num whitespace-nowrap text-lg font-bold">{rupiah(k.saldo)}</div>}
              </Card>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            <Lock size={12} className="inline text-gold" /> Dana terikat hanya digunakan sesuai tujuannya dan tidak dicampur dengan kas operasional.
          </p>
        </section>

        {r.program.length > 0 && (
          <section>
            <SectionTitle>Program donasi</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {r.program.map((p) => (
                <Card key={p.id} className="p-5">
                  <div className="font-bold">{p.nama}</div>
                  <div className="mt-4">
                    <Progress value={p.terkumpul} max={p.target} />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>
                      <b className="num">{rupiah(p.terkumpul)}</b> / {rupiah(p.target)}
                    </span>
                    <span className="text-muted">
                      {p.donatur} donatur{p.tenggat && ` · s.d. ${tanggal(p.tenggat, { day: "numeric", month: "short", year: "numeric" })}`}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <SectionTitle>Pengeluaran besar</SectionTitle>
            <Card className="divide-y divide-line">
              {r.pengeluaran_besar.length === 0 && <div className="p-5 text-muted">Belum ada.</div>}
              {r.pengeluaran_besar.map((t, i) => (
                <div key={i} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="font-semibold">{t.keterangan}</div>
                    <div className="text-sm text-muted">
                      {tanggal(t.tanggal, { day: "numeric", month: "short", year: "numeric" })} · {t.kategori}
                    </div>
                  </div>
                  <div className="num whitespace-nowrap font-bold">{rupiah(t.nominal)}</div>
                </div>
              ))}
            </Card>
            <p className="mt-2 text-sm text-muted">Setiap pengeluaran di atas {rupiah(db.masjid.batas_persetujuan)} telah disetujui Ketua DKM dan dilengkapi nota.</p>
          </section>
          <section>
            <SectionTitle>Donasi terbaru</SectionTitle>
            <Card className="divide-y divide-line">
              {r.donasi_terbaru.map((d, i) => (
                <div key={i} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="font-semibold">{d.nama}</div>
                    <div className="text-sm text-muted">
                      {tanggal(d.tanggal, { day: "numeric", month: "short" })} · {d.tujuan}
                    </div>
                  </div>
                  <div className="num whitespace-nowrap font-bold text-masuk">{rupiah(d.nominal)}</div>
                </div>
              ))}
            </Card>
          </section>
        </div>

        <section>
          <SectionTitle>Laporan Jumat terakhir</SectionTitle>
          <Card className="p-5">
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-ink-2">{teksLaporanJumat(db, jumat).replace(/\*|_/g, "")}</pre>
          </Card>
        </section>

        <div className="rounded-2xl border border-line bg-canvas p-6 text-center">
          <div className="font-serif text-2xl font-bold">Ingin ikut berkontribusi?</div>
          <Button href="/donasi" size="lg" className="mt-4">
            <HandHeart size={20} /> Donasi sekarang
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}
