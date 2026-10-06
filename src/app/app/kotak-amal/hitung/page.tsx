"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { periodeTerkunci } from "@/lib/logic";
import { JABATAN_LABEL, PECAHAN, jumatTerakhir, ribuan, rupiah, today, uid } from "@/lib/format";
import { Button, Card, Field, Input, NominalInput, PageHeader, Segmented, Select, cx, useToast } from "@/components/ui";
import { Avatar } from "@/components/app-shell";

export default function Hitung() {
  const { db, saya, transaksi } = useStore();
  const router = useRouter();
  const toast = useToast();
  const kotakList = db.kotak.filter((k) => k.aktif);
  const [kotak, setKotak] = useState(kotakList[0]?.id ?? "");
  const [tgl, setTgl] = useState(new Date().getDay() === 5 ? today() : jumatTerakhir());
  const [mode, setMode] = useState<"pecahan" | "total">("pecahan");
  const [pecahan, setPecahan] = useState<Record<string, number>>({});
  const [koin, setKoin] = useState(0);
  const [totalManual, setTotalManual] = useState(0);
  const [saksi, setSaksi] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  if (!bisa.hitungKotak(saya)) return <Card className="p-6">Sesi penghitungan dibuka oleh Bendahara. Anda akan diminta konfirmasi bila dipilih sebagai saksi.</Card>;

  const totalPecahan = PECAHAN.reduce((a, d) => a + d * (pecahan[d] ?? 0), 0) + koin;
  const total = mode === "pecahan" ? totalPecahan : totalManual;
  const calon = db.pengurus.filter((p) => p.aktif && p.id !== saya!.id);

  const simpan = () => {
    setErr(null);
    if (!kotak) return setErr("Pilih kotak amal.");
    if (total <= 0) return setErr("Total hitungan masih kosong.");
    if (saksi.length < 1) return setErr("Pilih minimal satu saksi — kotak amal wajib dihitung minimal dua orang.");
    if (periodeTerkunci(db, tgl)) return setErr("Periode ini sudah tutup buku.");
    const id = uid();
    const rincian: Record<string, number> | null =
      mode === "pecahan" ? Object.fromEntries([...Object.entries(pecahan).filter(([, n]) => n > 0), ...(koin ? [["koin", koin]] : [])]) : null;
    transaksi(
      (d) => {
        d.penghitungan.push({ id, kotak_id: kotak, tanggal: tgl, rincian_pecahan: rincian, total, status: "menunggu", dicatat_oleh: saya!.id, transaksi_id: null, created_at: new Date().toISOString() });
        for (const s of saksi) d.saksi.push({ id: uid(), penghitungan_id: id, pengurus_id: s, status: "menunggu", catatan: "", waktu: null });
      },
      { aksi: `Membuka penghitungan ${db.kotak.find((k) => k.id === kotak)?.nama} ${rupiah(total)}`, entitas: "penghitungan", entitas_id: id },
    );
    toast("Tersimpan. Menunggu konfirmasi saksi.");
    router.push(`/app/kotak-amal/${id}`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Penghitungan kotak amal" back="/app/kotak-amal" />
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Kotak">
            <Select value={kotak} onChange={(e) => setKotak(e.target.value)}>
              {kotakList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal">
            <Input type="date" value={tgl} max={today()} onChange={(e) => setTgl(e.target.value)} />
          </Field>
        </div>

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "pecahan", label: "Rincian pecahan" },
            { value: "total", label: "Total saja" },
          ]}
        />

        {mode === "pecahan" ? (
          <div className="divide-y divide-line rounded-xl border border-line">
            {PECAHAN.map((d) => (
              <div key={d} className="flex items-center gap-3 px-4 py-2">
                <div className="num w-24 font-semibold">{ribuan(d)}</div>
                <span className="text-muted">×</span>
                <input
                  inputMode="numeric"
                  className="num h-11 w-20 rounded-lg border border-line-2 text-center text-lg font-semibold outline-none focus:border-brand"
                  value={pecahan[d] || ""}
                  placeholder="0"
                  onChange={(e) => setPecahan({ ...pecahan, [d]: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) })}
                />
                <div className="num ml-auto text-right text-muted">{pecahan[d] ? rupiah(d * pecahan[d]) : ""}</div>
              </div>
            ))}
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-24 font-semibold">Koin</div>
              <div className="ml-auto w-44">
                <NominalInput value={koin} onChange={setKoin} />
              </div>
            </div>
          </div>
        ) : (
          <Field label="Total hitungan">
            <NominalInput value={totalManual} onChange={setTotalManual} />
          </Field>
        )}

        <div className="flex items-center justify-between rounded-xl bg-gold-soft px-4 py-3">
          <span className="font-semibold text-ink-2">Total</span>
          <span className="num text-2xl font-bold">{rupiah(total)}</span>
        </div>

        <div>
          <div className="mb-1.5 font-semibold text-ink-2">Saksi penghitungan</div>
          <p className="mb-3 text-sm text-muted">Saksi akan mengonfirmasi angka ini dari HP masing-masing.</p>
          <div className="space-y-2">
            {calon.map((p) => {
              const on = saksi.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSaksi(on ? saksi.filter((x) => x !== p.id) : [...saksi, p.id])}
                  className={cx("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition", on ? "border-brand bg-brand-soft" : "border-line")}
                >
                  <Avatar nama={p.nama} />
                  <div className="flex-1">
                    <div className="font-semibold">{p.nama}</div>
                    <div className="text-sm text-muted">{JABATAN_LABEL[p.jabatan]}</div>
                  </div>
                  <span className={cx("flex h-6 w-6 items-center justify-center rounded-md border-2", on ? "border-brand bg-brand text-white" : "border-line-2")}>{on && <Check size={15} strokeWidth={3} />}</span>
                </button>
              );
            })}
          </div>
        </div>

        {err && <p className="rounded-xl bg-keluar-soft p-3 font-medium text-keluar">{err}</p>}
        <Button size="lg" className="w-full" onClick={simpan}>
          Simpan & minta konfirmasi saksi
        </Button>
      </Card>
    </div>
  );
}
