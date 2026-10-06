"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Paperclip, Plus, Search, Undo2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { sudahDikoreksi } from "@/lib/logic";
import { rupiah, tanggal } from "@/lib/format";
import { Badge, Button, Card, Empty, Input, PageHeader, Select, cx } from "@/components/ui";

function Kas() {
  const { db, saya } = useStore();
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const [kantong, setKantong] = useState(sp.get("kantong") ?? "");
  const [kategori, setKategori] = useState("");
  const [arah, setArah] = useState("");
  const [pencatat, setPencatat] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [batas, setBatas] = useState(50);

  const hasil = useMemo(() => {
    const qq = q.toLowerCase();
    return [...db.transaksi]
      .filter(
        (t) =>
          (!kantong || t.kantong_id === kantong) &&
          (!kategori || t.kategori_id === kategori) &&
          (!arah || t.arah === arah) &&
          (!pencatat || t.dicatat_oleh === pencatat) &&
          (!dari || t.tanggal >= dari) &&
          (!sampai || t.tanggal <= sampai) &&
          (!qq || t.keterangan.toLowerCase().includes(qq) || t.pihak.toLowerCase().includes(qq)),
      )
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at));
  }, [db.transaksi, q, kantong, kategori, arah, pencatat, dari, sampai]);

  const masuk = hasil.filter((t) => t.arah === "masuk").reduce((a, t) => a + t.nominal, 0);
  const keluar = hasil.filter((t) => t.arah === "keluar").reduce((a, t) => a + t.nominal, 0);

  // kelompokkan per tanggal
  const grup = new Map<string, typeof hasil>();
  for (const t of hasil.slice(0, batas)) {
    if (!grup.has(t.tanggal)) grup.set(t.tanggal, []);
    grup.get(t.tanggal)!.push(t);
  }

  const adaFilter = kantong || kategori || arah || pencatat || dari || sampai || q;

  return (
    <div>
      <PageHeader
        title="Buku Kas"
        subtitle="Semua uang masuk dan keluar. Transaksi tidak bisa dihapus — kesalahan diperbaiki dengan koreksi."
        action={
          bisa.catatKas(saya) && (
            <>
              <Button href="/app/kas/baru?arah=masuk" variant="secondary">
                <ArrowDownLeft size={18} className="text-masuk" /> Masuk
              </Button>
              <Button href="/app/kas/baru?arah=keluar" variant="secondary">
                <ArrowUpRight size={18} className="text-keluar" /> Keluar
              </Button>
            </>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <Input placeholder="Cari keterangan, donatur, penerima…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-11" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Select value={arah} onChange={(e) => setArah(e.target.value)} aria-label="Arah">
            <option value="">Masuk & keluar</option>
            <option value="masuk">Kas masuk</option>
            <option value="keluar">Kas keluar</option>
          </Select>
          <Select value={kantong} onChange={(e) => setKantong(e.target.value)} aria-label="Kantong dana">
            <option value="">Semua kantong</option>
            {db.kantong.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </Select>
          <Select value={kategori} onChange={(e) => setKategori(e.target.value)} aria-label="Kategori">
            <option value="">Semua kategori</option>
            {db.kategori
              .filter((k) => !arah || k.arah === arah)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} ({k.arah})
                </option>
              ))}
          </Select>
          <Select value={pencatat} onChange={(e) => setPencatat(e.target.value)} aria-label="Pencatat">
            <option value="">Semua pencatat</option>
            {db.pengurus.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </Select>
          <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} aria-label="Dari tanggal" />
          <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} aria-label="Sampai tanggal" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="text-muted">{hasil.length} transaksi</span>
            <span>
              Masuk <b className="num text-masuk">{rupiah(masuk)}</b>
            </span>
            <span>
              Keluar <b className="num text-keluar">{rupiah(keluar)}</b>
            </span>
          </div>
          {adaFilter && (
            <button
              className="font-semibold text-brand"
              onClick={() => {
                setQ("");
                setKantong("");
                setKategori("");
                setArah("");
                setPencatat("");
                setDari("");
                setSampai("");
              }}
            >
              Hapus filter
            </button>
          )}
        </div>
      </Card>

      {hasil.length === 0 ? (
        <Card>
          <Empty icon={<Search />} title="Tidak ada transaksi">
            Coba ubah filter pencarian.
          </Empty>
        </Card>
      ) : (
        <div className="space-y-5">
          {[...grup.entries()].map(([tgl, list]) => (
            <div key={tgl}>
              <div className="mb-2 px-1 text-sm font-semibold text-muted">{tanggal(tgl, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
              <Card className="divide-y divide-line">
                {list.map((t) => {
                  const kat = db.kategori.find((k) => k.id === t.kategori_id);
                  const ktg = db.kantong.find((k) => k.id === t.kantong_id);
                  const dikoreksi = sudahDikoreksi(db, t.id);
                  return (
                    <Link key={t.id} href={`/app/kas/${t.id}`} className={cx("flex items-center gap-4 p-4 transition hover:bg-canvas", dikoreksi && "opacity-55")}>
                      <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.nominal < 0 ? "bg-black/[0.05] text-muted" : t.arah === "masuk" ? "bg-brand-soft text-masuk" : "bg-keluar-soft text-keluar")}>
                        {t.nominal < 0 ? <Undo2 size={18} /> : t.arah === "masuk" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={cx("truncate font-semibold", dikoreksi && "line-through")}>{t.keterangan || kat?.nama}</div>
                        <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                          <span>{kat?.nama}</span>·<span>{ktg?.nama}</span>
                          {t.bukti_url && <Paperclip size={13} />}
                          {t.nominal < 0 && <Badge>Pembalik koreksi</Badge>}
                          {dikoreksi && <Badge tone="amber">Dikoreksi</Badge>}
                        </div>
                      </div>
                      <div className={cx("num whitespace-nowrap text-right font-bold", t.arah === "masuk" && t.nominal > 0 ? "text-masuk" : "text-ink")}>
                        {(t.arah === "masuk") === t.nominal > 0 ? "+" : "−"}
                        {rupiah(Math.abs(t.nominal))}
                      </div>
                    </Link>
                  );
                })}
              </Card>
            </div>
          ))}
          {hasil.length > batas && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setBatas((b) => b + 50)}>
                Tampilkan lebih banyak
              </Button>
            </div>
          )}
        </div>
      )}

      {bisa.catatKas(saya) && (
        <Link href="/app/kas/baru" className="no-print fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg lg:hidden" aria-label="Catat transaksi">
          <Plus size={26} />
        </Link>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Kas />
    </Suspense>
  );
}
