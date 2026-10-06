"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Lock, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildRingkasanPublik } from "@/lib/logic";
import { rupiah } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { Button, Card, Field, FotoInput, Input, NominalInput, Textarea, Toggle, cx, useToast } from "@/components/ui";
import { Progress } from "@/components/chart";

const PRESET = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

function FormDonasi() {
  const { db, kirimDonasi } = useStore();
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const r = buildRingkasanPublik(db);
  const programAwal = r.program.find((p) => p.id === sp.get("program"));

  const [langkah, setLangkah] = useState<1 | 2>(1);
  const [tujuan, setTujuan] = useState<{ kantong: string; program: string | null }>(
    programAwal ? { kantong: programAwal.kantong_id, program: programAwal.id } : { kantong: r.kantong[0]?.id ?? "", program: null },
  );
  const [nominal, setNominal] = useState(100_000);
  const [namaD, setNamaD] = useState("");
  const [tampilNama, setTampilNama] = useState(false);
  const [wa, setWa] = useState("");
  const [doa, setDoa] = useState("");
  const [bukti, setBukti] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const namaTujuan = tujuan.program ? r.program.find((p) => p.id === tujuan.program)?.nama : r.kantong.find((k) => k.id === tujuan.kantong)?.nama;

  const lanjut = () => {
    setErr(null);
    if (nominal < 10_000) return setErr("Minimal donasi Rp10.000.");
    if (wa && wa.replace(/\D/g, "").length < 9) return setErr("Nomor WhatsApp tidak valid.");
    setLangkah(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const kirim = () => {
    setErr(null);
    if (!bukti) return setErr("Unggah foto/screenshot bukti pembayaran.");
    const d = kirimDonasi(
      { kantong_id: tujuan.kantong, program_id: tujuan.program, nama_donatur: namaD, anonim: !tampilNama || !namaD.trim(), no_wa: wa, nominal, doa, bukti: null },
      bukti,
    );
    router.push(`/kwitansi/${d.id}?baru=1`);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Infak & Sedekah</div>
        <h1 className="mt-2 font-serif text-4xl font-bold">Donasi untuk {db.masjid.nama}</h1>
        <p className="mt-2 text-muted">Tanpa perlu membuat akun. Kwitansi digital dikirim setelah donasi diverifikasi bendahara.</p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-3 text-sm font-semibold">
        <Step n={1} aktif={langkah === 1} selesai={langkah > 1} label="Isi donasi" />
        <span className="h-px w-10 bg-line-2" />
        <Step n={2} aktif={langkah === 2} selesai={false} label="Bayar & kirim bukti" />
      </div>

      {langkah === 1 ? (
        <Card className="space-y-7 p-5 sm:p-7">
          <div>
            <div className="mb-3 font-semibold text-ink-2">Tujuan donasi</div>
            {r.program.length > 0 && (
              <div className="mb-3 space-y-2">
                {r.program.map((p) => {
                  const on = tujuan.program === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setTujuan({ kantong: p.kantong_id, program: p.id })} className={cx("w-full rounded-xl border p-4 text-left transition", on ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-line hover:border-line-2")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{p.nama}</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-gold">Program</span>
                      </div>
                      <div className="mt-3">
                        <Progress value={p.terkumpul} max={p.target} />
                      </div>
                      <div className="mt-1.5 text-sm text-muted">
                        {rupiah(p.terkumpul)} dari {rupiah(p.target)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {r.kantong.map((k) => {
                const on = !tujuan.program && tujuan.kantong === k.id;
                return (
                  <button key={k.id} type="button" onClick={() => setTujuan({ kantong: k.id, program: null })} className={cx("rounded-xl border p-4 text-left transition", on ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-line hover:border-line-2")}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      {k.nama} {k.jenis === "terikat" && <Lock size={13} className="text-gold" />}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-sm text-muted">{k.deskripsi}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 font-semibold text-ink-2">Nominal</div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PRESET.map((p) => (
                <button key={p} type="button" onClick={() => setNominal(p)} className={cx("num h-12 rounded-xl border font-semibold transition", nominal === p ? "border-brand bg-brand-soft/60 text-brand ring-1 ring-brand" : "border-line hover:border-line-2")}>
                  {rupiah(p)}
                </button>
              ))}
            </div>
            <NominalInput value={nominal} onChange={setNominal} placeholder="Nominal lain" />
          </div>

          <div className="space-y-4">
            <Field label="Nama (opsional)">
              <Input value={namaD} onChange={(e) => setNamaD(e.target.value)} placeholder="Hamba Allah" />
            </Field>
            {namaD.trim() && <Toggle checked={tampilNama} onChange={setTampilNama} label="Izinkan nama saya tampil di halaman publik" hint="Jika tidak dicentang, nama ditampilkan sebagai “Hamba Allah”." />}
            <Field label="Nomor WhatsApp (opsional)" hint="Untuk menerima kwitansi digital. Hanya dilihat bendahara & ketua.">
              <Input inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xx xxxx xxxx" />
            </Field>
            <Field label="Doa / pesan (opsional)">
              <Textarea value={doa} onChange={(e) => setDoa(e.target.value)} rows={2} placeholder="Contoh: Untuk almarhum ayah kami" />
            </Field>
          </div>

          {err && <p className="rounded-xl bg-keluar-soft p-3 font-medium text-keluar">{err}</p>}
          <Button size="lg" className="w-full" onClick={lanjut}>
            Lanjut bayar {rupiah(nominal)}
          </Button>
        </Card>
      ) : (
        <Card className="space-y-6 p-5 sm:p-7">
          <div className="rounded-xl bg-canvas p-4">
            <div className="text-sm text-muted">Donasi untuk {namaTujuan}</div>
            <div className="num mt-0.5 text-3xl font-bold">{rupiah(nominal)}</div>
          </div>

          <div className="text-center">
            <div className="mb-3 font-semibold">Pindai QRIS dengan aplikasi bank / e-wallet</div>
            {db.masjid.qris_statis ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={db.masjid.qris_statis} alt="QRIS Masjid Al Misbah" className="mx-auto w-full max-w-[280px] rounded-xl border border-line" />
            ) : (
              <div className="mx-auto flex aspect-square w-full max-w-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line-2 bg-canvas p-6 text-sm text-muted">
                <ShieldCheck className="mb-2 text-gold" />
                QRIS resmi masjid belum diunggah pengurus.
                <br />
                Silakan transfer ke rekening di bawah.
              </div>
            )}
            <p className="mt-3 text-sm text-muted">Masukkan nominal tepat {rupiah(nominal)} saat membayar.</p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-4">
            <div>
              <div className="text-sm text-muted">Atau transfer ke</div>
              <div className="font-semibold">{db.masjid.rekening}</div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(db.masjid.rekening.replace(/\D/g, "") || db.masjid.rekening);
                toast("Nomor rekening disalin");
              }}
            >
              <Copy size={15} />
            </Button>
          </div>

          <Field label="Bukti pembayaran" hint="Screenshot atau foto struk dari aplikasi pembayaran.">
            <FotoInput value={bukti} onChange={setBukti} label="Unggah bukti pembayaran" />
          </Field>

          {err && <p className="rounded-xl bg-keluar-soft p-3 font-medium text-keluar">{err}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setLangkah(1)}>
              Kembali
            </Button>
            <Button size="lg" className="flex-1" onClick={kirim}>
              Kirim bukti donasi
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Step({ n, aktif, selesai, label }: { n: number; aktif: boolean; selesai: boolean; label: string }) {
  return (
    <span className={cx("flex items-center gap-2", aktif || selesai ? "text-ink" : "text-muted")}>
      <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-sm", aktif ? "bg-ink text-white" : selesai ? "bg-brand text-white" : "bg-black/[0.06]")}>{selesai ? <Check size={15} /> : n}</span>
      {label}
    </span>
  );
}

export default function Page() {
  return (
    <PublicShell>
      <Suspense>
        <FormDonasi />
      </Suspense>
    </PublicShell>
  );
}
