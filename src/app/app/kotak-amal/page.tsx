"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, ChevronRight, Plus } from "lucide-react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { rekapKotak } from "@/lib/logic";
import { jumatTerakhir, rupiah, tanggal, uid } from "@/lib/format";
import { STATUS_HITUNG } from "@/lib/label";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, SectionTitle, Select, useToast } from "@/components/ui";
import { BarChart } from "@/components/chart";

const WARNA = ["#b8892f", "#1f8a6a", "#9aa5a0", "#6b8fd6", "#d98b6a"];

export default function KotakAmal() {
  const { db, saya, insert } = useStore();
  const toast = useToast();
  const [tambah, setTambah] = useState(false);
  const [f, setF] = useState({ nama: "", lokasi: "", kantong_id: db.kantong[0]?.id ?? "", kategori_id: db.kategori.find((k) => k.sistem === "kotak_amal")?.id ?? "" });
  const rekap = rekapKotak(db, 8, jumatTerakhir());
  const kotak = db.kotak.filter((k) => k.aktif);
  const riwayat = [...db.penghitungan].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at)).slice(0, 20);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kotak Amal & Infak Jumat"
        subtitle="Dihitung minimal dua orang. Transaksi baru masuk kas setelah semua saksi mengonfirmasi."
        action={
          bisa.hitungKotak(saya) && (
            <Button href="/app/kotak-amal/hitung">
              <Plus size={18} /> Mulai penghitungan
            </Button>
          )
        }
      />

      <section>
        <SectionTitle action={bisa.kelolaMaster(saya) && <button className="text-sm font-semibold text-brand" onClick={() => setTambah(true)}>+ Tambah kotak</button>}>Daftar kotak</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {kotak.map((k, i) => (
            <Card key={k.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: WARNA[i % WARNA.length] + "1f", color: WARNA[i % WARNA.length] }}>
                  <Box size={20} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{k.nama}</div>
                  <div className="truncate text-sm text-muted">{k.lokasi}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted">
                Masuk ke kantong <b className="text-ink-2">{db.kantong.find((x) => x.id === k.kantong_id)?.nama}</b>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Rekap per Jumat · 8 pekan</SectionTitle>
        <Card className="p-5">
          <BarChart
            data={rekap.map((w) => ({ label: tanggal(w.jumat, { day: "numeric", month: "short" }), values: kotak.map((k) => w.perKotak[k.id] ?? 0) }))}
            series={kotak.map((k, i) => ({ name: k.nama, color: WARNA[i % WARNA.length] }))}
          />
          <div className="-mx-5 mt-5 overflow-x-auto border-t border-line">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-5 py-3 font-semibold">Jumat</th>
                  {kotak.map((k) => (
                    <th key={k.id} className="px-3 py-3 text-right font-semibold">
                      {k.nama}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="num">
                {[...rekap].reverse().map((w) => (
                  <tr key={w.jumat} className="border-t border-line">
                    <td className="px-5 py-2.5">{tanggal(w.jumat, { day: "numeric", month: "short", year: "numeric" })}</td>
                    {kotak.map((k) => (
                      <td key={k.id} className="px-3 py-2.5 text-right">
                        {w.perKotak[k.id] ? rupiah(w.perKotak[k.id]) : "—"}
                      </td>
                    ))}
                    <td className="px-5 py-2.5 text-right font-bold">{rupiah(w.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Riwayat penghitungan</SectionTitle>
        <Card className="divide-y divide-line">
          {riwayat.map((p) => {
            const k = db.kotak.find((x) => x.id === p.kotak_id);
            const s = db.saksi.filter((x) => x.penghitungan_id === p.id);
            return (
              <Link key={p.id} href={`/app/kotak-amal/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-canvas">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{k?.nama}</div>
                  <div className="text-sm text-muted">
                    {tanggal(p.tanggal, { day: "numeric", month: "short", year: "numeric" })} · {nama(db, p.dicatat_oleh)} + {s.map((x) => nama(db, x.pengurus_id)).join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="num font-bold">{rupiah(p.total)}</div>
                  <Badge tone={STATUS_HITUNG[p.status].tone}>{STATUS_HITUNG[p.status].label}</Badge>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            );
          })}
        </Card>
      </section>

      <Modal
        open={tambah}
        onClose={() => setTambah(false)}
        title="Tambah kotak amal"
        footer={
          <Button
            className="flex-1"
            disabled={!f.nama.trim()}
            onClick={() => {
              insert("kotak", { id: uid(), nama: f.nama.trim(), lokasi: f.lokasi.trim(), kantong_id: f.kantong_id, kategori_id: f.kategori_id, aktif: true }, `Menambah kotak amal ${f.nama}`);
              setTambah(false);
              setF({ ...f, nama: "", lokasi: "" });
              toast("Kotak amal ditambahkan");
            }}
          >
            Simpan
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Nama kotak">
            <Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="Contoh: Kotak Anak Yatim" />
          </Field>
          <Field label="Lokasi">
            <Input value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} placeholder="Contoh: Dekat mimbar" />
          </Field>
          <Field label="Masuk ke kantong dana">
            <Select value={f.kantong_id} onChange={(e) => setF({ ...f, kantong_id: e.target.value })}>
              {db.kantong.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kategori pemasukan">
            <Select value={f.kategori_id} onChange={(e) => setF({ ...f, kategori_id: e.target.value })}>
              {db.kategori
                .filter((k) => k.arah === "masuk" && !k.sistem?.startsWith("transfer"))
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
