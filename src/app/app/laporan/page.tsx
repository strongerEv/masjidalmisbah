"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Copy, Download, FileSpreadsheet, ImageDown, Lock, MessageCircle, Printer } from "lucide-react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { labelPeriode, laporanJumat, perKategori, ringkasanPeriode, saldoTotal, teksLaporanJumat } from "@/lib/logic";
import { gambarLaporanJumat } from "@/lib/gambar";
import { addDays, bulanTahun, hari, hijriah, isoDate, jumatTerakhir, rupiah, tanggal, today, toDate, uid, waktu } from "@/lib/format";
import { Badge, Button, Card, Field, Modal, NominalInput, PageHeader, Segmented, Select, Textarea, useToast } from "@/components/ui";

type Tab = "jumat" | "bulanan" | "tahunan" | "tutup";

export default function Laporan() {
  const [tab, setTab] = useState<Tab>("jumat");
  return (
    <div>
      <div className="no-print">
        <PageHeader title="Laporan" subtitle="Laporan Jumat siap kirim, laporan bulanan & tahunan, serta tutup buku." />
        <div className="mb-6 max-w-xl">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "jumat", label: "Jumat" },
              { value: "bulanan", label: "Bulanan" },
              { value: "tahunan", label: "Tahunan" },
              { value: "tutup", label: "Tutup buku" },
            ]}
          />
        </div>
      </div>
      {tab === "jumat" && <LaporanJumat />}
      {tab === "bulanan" && <LaporanPeriode mode="bulan" />}
      {tab === "tahunan" && <LaporanPeriode mode="tahun" />}
      {tab === "tutup" && <TutupBuku />}
    </div>
  );
}

function KopLaporan({ judul, sub }: { judul: string; sub: string }) {
  const { db } = useStore();
  return (
    <div className="flex items-center gap-4 border-b border-line pb-5">
      <Image src="/logo.png" alt="" width={56} height={56} className="rounded-xl" />
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-gold">{judul}</div>
        <div className="font-serif text-xl font-bold">{db.masjid.nama}</div>
        <div className="text-sm text-muted">{sub}</div>
      </div>
    </div>
  );
}

function LaporanJumat() {
  const { db } = useStore();
  const toast = useToast();
  const daftar = useMemo(() => Array.from({ length: 12 }, (_, i) => addDays(jumatTerakhir(), -7 * i)), []);
  const [jumat, setJumat] = useState(daftar[0]);
  const [gambar, setGambar] = useState<string | null>(null);
  const l = laporanJumat(db, jumat);
  const teks = teksLaporanJumat(db, jumat);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="no-print">
          <Select value={jumat} onChange={(e) => setJumat(e.target.value)} aria-label="Pilih Jumat">
            {daftar.map((d) => (
              <option key={d} value={d}>
                Jumat, {tanggal(d)}
              </option>
            ))}
          </Select>
        </div>
        <Card className="print-full p-6">
          <KopLaporan judul="Laporan Kas Jumat" sub={`${hari(jumat)} · ${hijriah(jumat)}`} />
          <div className="divide-y divide-line">
            <Baris label="Saldo pekan lalu" nilai={rupiah(l.awal)} />
            <div className="py-3">
              <Baris label="Pemasukan" nilai={rupiah(l.masuk)} tone="masuk" plain />
              {l.kategori.masuk.map((k) => (
                <Baris key={k.nama} label={k.nama} nilai={rupiah(k.total)} sub />
              ))}
            </div>
            <div className="py-3">
              <Baris label="Pengeluaran" nilai={rupiah(l.keluar)} tone="keluar" plain />
              {l.kategori.keluar.map((k) => (
                <Baris key={k.nama} label={k.nama} nilai={rupiah(k.total)} sub />
              ))}
              {l.kategori.keluar.length === 0 && <div className="pl-4 text-sm text-muted">Tidak ada pengeluaran</div>}
            </div>
            <div className="flex items-baseline justify-between py-4">
              <span className="text-lg font-bold">Saldo akhir</span>
              <span className="num text-2xl font-bold">{rupiah(l.akhir)}</span>
            </div>
          </div>
          <div className="mt-2 rounded-xl bg-canvas p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">Saldo per kantong</div>
            {l.baris.map((b) => (
              <div key={b.kantong.id} className="flex justify-between py-1">
                <span>
                  {b.kantong.nama} {b.kantong.jenis === "terikat" && <Lock size={12} className="inline text-gold" />}
                </span>
                <span className="num font-semibold">{rupiah(b.akhir)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Periode {tanggal(l.dari)} – {tanggal(jumat)}. Penghitungan kotak amal terkonfirmasi pekan ini: {rupiah(l.kotak)}.</p>
        </Card>
      </div>
      <div className="no-print space-y-4 lg:col-span-2">
        <Card className="p-5">
          <div className="mb-3 font-semibold">Bagikan</div>
          <div className="grid gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(teks)}`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1f9d55] font-semibold text-white">
              <MessageCircle size={18} /> Kirim teks ke WhatsApp
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(teks);
                toast("Teks laporan disalin");
              }}
            >
              <Copy size={18} /> Salin teks
            </Button>
            <Button variant="secondary" onClick={async () => setGambar(await gambarLaporanJumat(db, jumat))}>
              <ImageDown size={18} /> Buat gambar siap tayang
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={18} /> Cetak / PDF
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 font-semibold">Pratinjau teks WhatsApp</div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-canvas p-4 font-sans text-sm leading-relaxed text-ink-2">{teks}</pre>
        </Card>
      </div>
      <Modal
        open={!!gambar}
        onClose={() => setGambar(null)}
        title="Gambar laporan"
        footer={
          <a href={gambar ?? ""} download={`laporan-jumat-${jumat}.png`} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white">
            <Download size={18} /> Unduh PNG
          </a>
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {gambar && <img src={gambar} alt="Laporan Jumat" className="w-full rounded-xl border border-line" />}
      </Modal>
    </div>
  );
}

function Baris({ label, nilai, tone, sub, plain }: { label: string; nilai: string; tone?: "masuk" | "keluar"; sub?: boolean; plain?: boolean }) {
  return (
    <div className={sub ? "flex justify-between py-0.5 pl-4 text-sm text-muted" : plain ? "flex justify-between pb-1 font-semibold" : "flex justify-between py-3 font-semibold"}>
      <span>{sub ? `• ${label}` : label}</span>
      <span className={`num ${tone === "masuk" ? "text-masuk" : tone === "keluar" ? "text-keluar" : ""}`}>{nilai}</span>
    </div>
  );
}

function unduhCsv(nama: string, rows: (string | number)[][]) {
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = nama;
  a.click();
  URL.revokeObjectURL(a.href);
}

function LaporanPeriode({ mode }: { mode: "bulan" | "tahun" }) {
  const { db } = useStore();
  const now = today();
  const opsi = useMemo(() => {
    if (mode === "tahun") {
      const y = toDate(now).getFullYear();
      return [y, y - 1].map((t) => ({ value: String(t), label: String(t) }));
    }
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(toDate(now).getFullYear(), toDate(now).getMonth() - i, 1);
      const p = isoDate(d).slice(0, 7);
      return { value: p, label: bulanTahun(p) };
    });
  }, [mode, now]);
  const [pilih, setPilih] = useState(opsi[0].value);
  const dari = mode === "tahun" ? `${pilih}-01-01` : `${pilih}-01`;
  const akhirBulan = mode === "tahun" ? `${pilih}-12-31` : isoDate(new Date(Number(pilih.slice(0, 4)), Number(pilih.slice(5, 7)), 0));
  const sampai = akhirBulan > now ? now : akhirBulan;
  const r = ringkasanPeriode(db, dari, sampai);
  const k = perKategori(db, dari, sampai);
  const judul = mode === "tahun" ? `Laporan Tahunan ${pilih}` : `Laporan Bulanan ${bulanTahun(pilih)}`;

  const ekspor = () => {
    const rows: (string | number)[][] = [[db.masjid.nama], [judul], [`Periode ${tanggal(dari)} - ${tanggal(sampai)}`], [], ["Kantong", "Saldo awal", "Pemasukan", "Pengeluaran", "Saldo akhir"]];
    for (const b of r.baris) rows.push([b.kantong.nama, b.awal, b.masuk, b.keluar, b.akhir]);
    rows.push(["Total", r.awal, r.masuk, r.keluar, r.akhir], [], ["Kategori", "Arah", "Total"]);
    for (const x of [...k.masuk, ...k.keluar]) rows.push([x.nama, x.arah, x.total]);
    rows.push([], ["Tanggal", "Arah", "Kategori", "Kantong", "Keterangan", "Pihak", "Nominal", "Dicatat oleh"]);
    for (const t of db.transaksi.filter((t) => t.tanggal >= dari && t.tanggal <= sampai).sort((a, b) => a.tanggal.localeCompare(b.tanggal))) {
      rows.push([t.tanggal, t.arah, db.kategori.find((c) => c.id === t.kategori_id)?.nama ?? "", db.kantong.find((c) => c.id === t.kantong_id)?.nama ?? "", t.keterangan, t.pihak, t.nominal, nama(db, t.dicatat_oleh)]);
    }
    unduhCsv(`${judul.toLowerCase().replace(/\s+/g, "-")}.csv`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap gap-2">
        <div className="w-56">
          <Select value={pilih} onChange={(e) => setPilih(e.target.value)} aria-label="Periode">
            {opsi.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="secondary" onClick={ekspor}>
          <FileSpreadsheet size={18} /> Ekspor Excel (CSV)
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={18} /> Cetak / PDF
        </Button>
      </div>
      <Card className="print-full p-6">
        <KopLaporan judul={judul} sub={`${labelPeriode(dari, sampai)} · ${hijriah(sampai)}`} />
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Saldo awal", r.awal, ""],
            ["Pemasukan", r.masuk, "text-masuk"],
            ["Pengeluaran", r.keluar, "text-keluar"],
            ["Saldo akhir", r.akhir, ""],
          ].map(([l, v, c]) => (
            <div key={l as string} className="rounded-xl bg-canvas p-4">
              <div className="text-sm text-muted">{l}</div>
              <div className={`num mt-0.5 text-lg font-bold ${c}`}>{rupiah(v as number)}</div>
            </div>
          ))}
        </div>
        <div className="-mx-6 mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-6 py-2 font-semibold">Kantong dana</th>
                <th className="px-3 py-2 text-right font-semibold">Saldo awal</th>
                <th className="px-3 py-2 text-right font-semibold">Masuk</th>
                <th className="px-3 py-2 text-right font-semibold">Keluar</th>
                <th className="px-6 py-2 text-right font-semibold">Saldo akhir</th>
              </tr>
            </thead>
            <tbody className="num">
              {r.baris.map((b) => (
                <tr key={b.kantong.id} className="border-b border-line">
                  <td className="px-6 py-2.5 font-semibold">{b.kantong.nama}</td>
                  <td className="px-3 py-2.5 text-right">{rupiah(b.awal)}</td>
                  <td className="px-3 py-2.5 text-right text-masuk">{rupiah(b.masuk)}</td>
                  <td className="px-3 py-2.5 text-right text-keluar">{rupiah(b.keluar)}</td>
                  <td className="px-6 py-2.5 text-right font-bold">{rupiah(b.akhir)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {(["masuk", "keluar"] as const).map((a) => {
            const list = k[a];
            const tot = list.reduce((s, x) => s + x.total, 0) || 1;
            return (
              <div key={a}>
                <div className="mb-2 font-semibold">{a === "masuk" ? "Pemasukan" : "Pengeluaran"} per kategori</div>
                {list.map((x) => (
                  <div key={x.nama} className="py-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{x.nama}</span>
                      <span className="num font-semibold">{rupiah(x.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                      <div className="h-full rounded-full" style={{ width: `${(x.total / tot) * 100}%`, background: a === "masuk" ? "#1f8a6a" : "#d9a28f" }} />
                    </div>
                  </div>
                ))}
                {list.length === 0 && <div className="text-sm text-muted">Tidak ada.</div>}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-muted">Transfer antar kantong tidak dihitung sebagai pemasukan/pengeluaran total. Dicetak {waktu(new Date().toISOString())}.</p>
      </Card>
    </div>
  );
}

function TutupBuku() {
  const { db, saya, transaksi } = useStore();
  const toast = useToast();
  const now = today();
  const [buka, setBuka] = useState<string | null>(null);
  const [riil, setRiil] = useState(0);
  const [catatan, setCatatan] = useState("");

  const bulanList = Array.from({ length: 13 }, (_, i) => isoDate(new Date(toDate(now).getFullYear(), toDate(now).getMonth() - i, 1)).slice(0, 7));
  const terkunci = new Map(db.tutup_buku.map((b) => [b.periode, b]));
  // Tutup buku berurutan: hanya bulan terbuka paling awal yang sudah berakhir
  const bisaDitutup = [...bulanList].reverse().find((p) => !terkunci.has(p) && p < now.slice(0, 7));
  const akhir = (p: string) => isoDate(new Date(Number(p.slice(0, 4)), Number(p.slice(5, 7)), 0));
  const saldoCatatan = buka ? saldoTotal(db, akhir(buka)) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5 text-ink-2">
        Setelah dicocokkan dengan saldo rekening dan uang tunai, bendahara mengunci periode. Transaksi di periode terkunci tidak bisa ditambah atau diubah; koreksi
        dicatat di periode berjalan.
      </Card>
      <Card className="divide-y divide-line">
        {bulanList.map((p) => {
          const b = terkunci.get(p);
          return (
            <div key={p} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{bulanTahun(p)}</div>
                {b ? (
                  <div className="text-sm text-muted">
                    Ditutup {nama(db, b.ditutup_oleh)} · {waktu(b.created_at)}
                    {b.saldo_riil !== b.saldo_catatan && ` · selisih ${rupiah(b.saldo_riil - b.saldo_catatan)}`}
                  </div>
                ) : (
                  <div className="text-sm text-muted">Saldo catatan akhir bulan {rupiah(saldoTotal(db, akhir(p) > now ? now : akhir(p)))}</div>
                )}
              </div>
              {b ? (
                <Badge tone="gold">
                  <Lock size={12} /> Terkunci
                </Badge>
              ) : p === bisaDitutup && bisa.tutupBuku(saya) ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setBuka(p);
                    setRiil(saldoTotal(db, akhir(p)));
                  }}
                >
                  Tutup buku
                </Button>
              ) : (
                <Badge>{p === now.slice(0, 7) ? "Berjalan" : "Terbuka"}</Badge>
              )}
            </div>
          );
        })}
      </Card>
      <Modal
        open={!!buka}
        onClose={() => setBuka(null)}
        title={`Tutup buku ${buka ? bulanTahun(buka) : ""}`}
        footer={
          <Button
            className="flex-1"
            onClick={() => {
              transaksi(
                (d) => {
                  d.tutup_buku.push({ id: uid(), periode: buka!, saldo_catatan: saldoCatatan, saldo_riil: riil, catatan: catatan.trim(), ditutup_oleh: saya!.id, created_at: new Date().toISOString() });
                },
                { aksi: `Tutup buku ${bulanTahun(buka!)}`, entitas: "tutup_buku", entitas_id: buka },
              );
              setBuka(null);
              setCatatan("");
              toast("Periode dikunci");
            }}
          >
            <Lock size={18} /> Kunci periode
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-between rounded-xl bg-canvas p-4">
            <span className="text-muted">Saldo menurut catatan</span>
            <span className="num font-bold">{rupiah(saldoCatatan)}</span>
          </div>
          <Field label="Saldo riil (rekening + uang tunai)">
            <NominalInput value={riil} onChange={setRiil} />
          </Field>
          <div className={`rounded-xl p-4 font-semibold ${riil === saldoCatatan ? "bg-brand-soft text-masuk" : "bg-warn-soft text-warn"}`}>
            {riil === saldoCatatan ? "Cocok — selisih Rp0" : `Selisih ${rupiah(riil - saldoCatatan)}. Telusuri dulu sebelum mengunci, atau tulis penjelasannya.`}
          </div>
          <Field label="Catatan">
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Contoh: cocok dengan rekening koran BSI dan kas tunai" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
