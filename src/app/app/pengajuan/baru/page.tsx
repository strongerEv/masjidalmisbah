"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { saldoKantong } from "@/lib/logic";
import { rupiah, uid } from "@/lib/format";
import { Button, Card, Field, FotoInput, Input, NominalInput, PageHeader, Segmented, Select, Toggle, useToast } from "@/components/ui";

function Form() {
  const { db, saya, insert } = useStore();
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const [jenis, setJenis] = useState<"pengeluaran" | "transfer">(sp.get("jenis") === "transfer" && bisa.catatKas(saya) ? "transfer" : "pengeluaran");
  const [tujuan, setTujuan] = useState(sp.get("tujuan") ?? "");
  const [nominal, setNominal] = useState(Number(sp.get("nominal")) || 0);
  const [kantong, setKantong] = useState(sp.get("kantong") ?? db.kantong.find((k) => k.jenis === "bebas")?.id ?? "");
  const [kantongTujuan, setKantongTujuan] = useState(db.kantong.find((k) => k.id !== kantong)?.id ?? "");
  const [kategori, setKategori] = useState(sp.get("kategori") ?? db.kategori.find((k) => k.arah === "keluar" && k.nama === "Perbaikan")?.id ?? "");
  const [lampiran, setLampiran] = useState<string | null>(null);
  const [rutin, setRutin] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const saldo = saldoKantong(db, kantong);
  const kirim = () => {
    setErr(null);
    if (tujuan.trim().length < 4) return setErr(jenis === "transfer" ? "Tuliskan alasan transfer." : "Tuliskan tujuan pengeluaran.");
    if (nominal <= 0) return setErr("Isi nominal.");
    if (jenis === "transfer" && kantong === kantongTujuan) return setErr("Kantong asal dan tujuan harus berbeda.");
    if (!rutin && nominal > saldo) return setErr(`Saldo kantong tidak cukup (${rupiah(saldo)}).`);
    const id = uid();
    insert(
      "pengajuan",
      {
        id,
        jenis,
        pengaju_id: saya!.id,
        tujuan: tujuan.trim(),
        nominal,
        kantong_id: kantong,
        kantong_tujuan_id: jenis === "transfer" ? kantongTujuan : null,
        kategori_id: jenis === "pengeluaran" ? kategori : null,
        lampiran_url: lampiran,
        rutin: jenis === "pengeluaran" && rutin,
        status: "menunggu",
        alasan: null,
        disetujui_oleh: null,
        waktu_keputusan: null,
        created_at: new Date().toISOString(),
      },
      `Mengajukan ${jenis} ${rupiah(nominal)}: ${tujuan}`,
    );
    toast("Pengajuan terkirim ke Ketua DKM");
    router.push(`/app/pengajuan/${id}`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={jenis === "transfer" ? "Transfer antar kantong" : "Ajukan pengeluaran"} back="/app/pengajuan" />
      <Card className="space-y-5 p-5 sm:p-6">
        {bisa.catatKas(saya) && (
          <Segmented
            value={jenis}
            onChange={setJenis}
            options={[
              { value: "pengeluaran", label: "Pengeluaran" },
              { value: "transfer", label: "Transfer kantong" },
            ]}
          />
        )}
        {jenis === "transfer" && (
          <p className="rounded-xl bg-gold-soft p-4 text-sm text-ink-2">Dana di kantong terikat hanya boleh dipakai untuk tujuannya. Transfer memerlukan persetujuan Ketua dan alasan tertulis.</p>
        )}
        <Field label={jenis === "transfer" ? "Alasan transfer" : "Tujuan / kebutuhan"}>
          <Input value={tujuan} onChange={(e) => setTujuan(e.target.value)} placeholder={jenis === "transfer" ? "Contoh: Sisa dana Ramadan dialihkan ke operasional" : "Contoh: Ganti pompa air tempat wudu"} />
        </Field>
        <Field label="Nominal">
          <NominalInput value={nominal} onChange={setNominal} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={jenis === "transfer" ? "Dari kantong" : "Kantong dana"} hint={`Saldo ${rupiah(saldo)}`}>
            <Select value={kantong} onChange={(e) => setKantong(e.target.value)}>
              {db.kantong.filter((k) => k.aktif).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </Select>
          </Field>
          {jenis === "transfer" ? (
            <Field label="Ke kantong">
              <Select value={kantongTujuan} onChange={(e) => setKantongTujuan(e.target.value)}>
                {db.kantong.filter((k) => k.aktif && k.id !== kantong).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Kategori">
              <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                {db.kategori.filter((k) => k.arah === "keluar" && k.aktif && !k.sistem).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        {jenis === "pengeluaran" && (
          <Field label="Lampiran (penawaran harga / foto kerusakan)">
            <FotoInput value={lampiran} onChange={setLampiran} label="Tambah foto lampiran" />
          </Field>
        )}
        {jenis === "pengeluaran" && bisa.catatKas(saya) && (
          <Toggle checked={rutin} onChange={setRutin} label="Pengeluaran rutin bulanan" hint="Contoh listrik atau honor marbot. Sekali disetujui, bisa dibayar tiap bulan tanpa persetujuan ulang (maksimal nominal ini)." />
        )}
        {err && <p className="rounded-xl bg-keluar-soft p-3 font-medium text-keluar">{err}</p>}
        <Button size="lg" className="w-full" onClick={kirim}>
          Kirim ke Ketua DKM
        </Button>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
