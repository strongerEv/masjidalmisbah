"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";
import { useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { periodeTerkunci, saldoKantong } from "@/lib/logic";
import { rupiah, today, uid } from "@/lib/format";
import type { Arah, Transaksi } from "@/lib/types";
import { Button, Card, Field, FotoInput, Input, NominalInput, PageHeader, Segmented, Select, Textarea, useToast } from "@/components/ui";

function Form() {
  const { db, saya, insert } = useStore();
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const rutin = db.pengajuan.find((p) => p.id === sp.get("rutin") && p.rutin && p.status === "disetujui");

  const [arah, setArah] = useState<Arah>(rutin ? "keluar" : sp.get("arah") === "keluar" ? "keluar" : "masuk");
  const [nominal, setNominal] = useState(rutin?.nominal ?? 0);
  const [tgl, setTgl] = useState(today());
  const katDefault = (a: Arah) => db.kategori.find((k) => k.arah === a && k.aktif && !k.sistem?.startsWith("transfer"))?.id ?? "";
  const [kategori, setKategori] = useState(rutin?.kategori_id ?? katDefault(arah));
  const [kantong, setKantong] = useState(rutin?.kantong_id ?? db.kantong.find((k) => k.jenis === "bebas")?.id ?? db.kantong[0]?.id);
  const [pihak, setPihak] = useState("");
  const [ket, setKet] = useState(rutin?.tujuan ?? "");
  const [bukti, setBukti] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!bisa.catatKas(saya)) {
    return (
      <Card className="p-6">
        <p className="font-semibold">Pencatatan kas hanya dilakukan oleh Bendahara.</p>
        <p className="mt-1 text-muted">Untuk kebutuhan dana, silakan buat pengajuan.</p>
        <Button href="/app/pengajuan/baru" className="mt-4">
          Buat pengajuan
        </Button>
      </Card>
    );
  }

  const saldo = kantong ? saldoKantong(db, kantong) : 0;
  const batas = db.masjid.batas_persetujuan;
  const perluPersetujuan = arah === "keluar" && !rutin && nominal > batas;
  const melebihiRutin = rutin && nominal > rutin.nominal;
  const terkunci = periodeTerkunci(db, tgl);
  const kategoriList = db.kategori.filter((k) => k.arah === arah && k.aktif && !k.sistem?.startsWith("transfer"));

  const simpan = (lagi: boolean) => {
    setErr(null);
    if (nominal <= 0) return setErr("Isi nominal terlebih dahulu.");
    if (!kategori || !kantong) return setErr("Pilih kategori dan kantong dana.");
    if (terkunci) return setErr("Periode ini sudah tutup buku.");
    if (arah === "keluar") {
      if (!bukti) return setErr("Foto nota wajib untuk kas keluar.");
      if (perluPersetujuan) return setErr(`Pengeluaran di atas ${rupiah(batas)} wajib diajukan dan disetujui Ketua DKM.`);
      if (melebihiRutin) return setErr(`Melebihi nominal rutin yang disetujui (${rupiah(rutin!.nominal)}).`);
      if (nominal > saldo) return setErr(`Saldo kantong tidak cukup (${rupiah(saldo)}).`);
    }
    const t: Transaksi = {
      id: uid(),
      kantong_id: kantong!,
      kategori_id: kategori,
      arah,
      tanggal: tgl,
      nominal,
      keterangan: ket.trim() || db.kategori.find((k) => k.id === kategori)!.nama,
      pihak: pihak.trim(),
      bukti_url: bukti,
      sumber: rutin ? "pengajuan" : "manual",
      sumber_id: rutin?.id ?? null,
      koreksi_dari: null,
      alasan_koreksi: null,
      dicatat_oleh: saya!.id,
      created_at: new Date().toISOString(),
    };
    try {
      insert("transaksi", t, `Mencatat kas ${arah} ${rupiah(nominal)}`);
    } catch (e) {
      return setErr((e as Error).message);
    }
    toast(`Kas ${arah} ${rupiah(nominal)} tersimpan`);
    if (lagi) {
      setNominal(0);
      setPihak("");
      setKet("");
      setBukti(null);
      window.scrollTo({ top: 0 });
    } else router.push("/app/kas");
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={rutin ? "Bayar pengeluaran rutin" : "Catat transaksi"} back="/app/kas" />
      <Card className="space-y-5 p-5 sm:p-6">
        {!rutin && (
          <Segmented
            value={arah}
            onChange={(v) => {
              setArah(v);
              setKategori(katDefault(v));
            }}
            options={[
              { value: "masuk", label: "Kas masuk" },
              { value: "keluar", label: "Kas keluar" },
            ]}
          />
        )}
        {rutin && (
          <div className="rounded-xl bg-brand-soft p-4 text-sm text-ink-2">
            <b>{rutin.tujuan}</b> sudah disetujui Ketua sebagai pengeluaran rutin bulanan, maksimal {rupiah(rutin.nominal)}. Tidak perlu persetujuan ulang.
          </div>
        )}

        <Field label="Nominal">
          <NominalInput value={nominal} onChange={setNominal} autoFocus />
        </Field>

        {perluPersetujuan && (
          <div className="flex gap-3 rounded-xl bg-warn-soft p-4 text-sm text-ink-2">
            <AlertTriangle size={20} className="shrink-0 text-warn" />
            <div>
              Di atas batas {rupiah(batas)} — wajib disetujui Ketua DKM.{" "}
              <Link href={`/app/pengajuan/baru?nominal=${nominal}&kantong=${kantong}&kategori=${kategori}&tujuan=${encodeURIComponent(ket)}`} className="font-semibold text-warn underline">
                Buat pengajuan
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tanggal" error={terkunci ? "Periode sudah tutup buku" : null}>
            <Input type="date" value={tgl} max={today()} onChange={(e) => setTgl(e.target.value)} />
          </Field>
          <Field label="Kategori" hint={<Link href="/app/pengaturan#kategori" className="text-brand">Kelola kategori</Link>}>
            <Select value={kategori} onChange={(e) => setKategori(e.target.value)} disabled={!!rutin}>
              {kategoriList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Kantong dana" hint={arah === "keluar" ? `Saldo tersedia ${rupiah(saldo)}` : undefined}>
          <Select value={kantong} onChange={(e) => setKantong(e.target.value)} disabled={!!rutin}>
            {db.kantong
              .filter((k) => k.aktif)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} {k.jenis === "terikat" ? "· terikat" : ""}
                </option>
              ))}
          </Select>
        </Field>
        {arah === "keluar" && db.kantong.find((k) => k.id === kantong)?.jenis === "terikat" && (
          <div className="-mt-2 flex items-center gap-2 text-sm text-gold">
            <Lock size={14} /> Kantong terikat — hanya untuk tujuan: {db.kantong.find((k) => k.id === kantong)?.deskripsi}
          </div>
        )}

        <Field label={arah === "masuk" ? "Nama donatur / sumber (opsional)" : "Penerima"}>
          <Input value={pihak} onChange={(e) => setPihak(e.target.value)} placeholder={arah === "masuk" ? "Hamba Allah" : "Nama toko / orang"} />
        </Field>
        <Field label="Keterangan">
          <Textarea value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Contoh: Token listrik bulan ini" rows={2} />
        </Field>
        <Field label={arah === "keluar" ? "Foto nota (wajib)" : "Foto bukti (opsional)"}>
          <FotoInput value={bukti} onChange={setBukti} />
        </Field>

        {err && <p className="rounded-xl bg-keluar-soft p-3 font-medium text-keluar">{err}</p>}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <Button size="lg" className="flex-1" onClick={() => simpan(false)}>
            Simpan
          </Button>
          <Button size="lg" variant="secondary" className="flex-1" onClick={() => simpan(true)}>
            Simpan & catat lagi
          </Button>
        </div>
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
