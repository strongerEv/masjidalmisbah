"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { History, Lock } from "lucide-react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { periodeTerkunci, sudahDikoreksi } from "@/lib/logic";
import { rupiah, tanggal, today, uid, waktu } from "@/lib/format";
import type { Transaksi } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Modal, NominalInput, PageHeader, Segmented, Select, Textarea, cx, useToast } from "@/components/ui";

const SUMBER: Record<Transaksi["sumber"], string> = {
  manual: "Dicatat manual",
  donasi: "Donasi QRIS",
  kotak: "Penghitungan kotak amal",
  pengajuan: "Pengajuan disetujui",
  transfer: "Transfer antar kantong",
  koreksi: "Koreksi",
};

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const { db, saya, transaksi } = useStore();
  const toast = useToast();
  const t = db.transaksi.find((x) => x.id === id);
  const [koreksi, setKoreksi] = useState(false);
  const [mode, setMode] = useState<"ubah" | "batal">("ubah");
  const [alasan, setAlasan] = useState("");
  const [nominal, setNominal] = useState(t?.nominal ?? 0);
  const [kategori, setKategori] = useState(t?.kategori_id ?? "");
  const [kantong, setKantong] = useState(t?.kantong_id ?? "");
  const [ket, setKet] = useState(t?.keterangan ?? "");
  const [err, setErr] = useState<string | null>(null);

  if (!t) return <Empty title="Transaksi tidak ditemukan" />;

  const kat = db.kategori.find((k) => k.id === t.kategori_id);
  const ktg = db.kantong.find((k) => k.id === t.kantong_id);
  const dikoreksi = sudahDikoreksi(db, t.id);
  const terkait = db.transaksi.filter((x) => x.koreksi_dari === t.id);
  const asal = t.koreksi_dari ? db.transaksi.find((x) => x.id === t.koreksi_dari) : null;
  const bolehKoreksi = bisa.catatKas(saya) && !dikoreksi && t.nominal > 0 && t.sumber !== "transfer";
  const tglKoreksi = periodeTerkunci(db, t.tanggal) ? today() : t.tanggal;
  const log = db.log_aktivitas.filter((l) => l.entitas_id === t.id);

  const simpanKoreksi = () => {
    setErr(null);
    if (alasan.trim().length < 5) return setErr("Tuliskan alasan koreksi (minimal 5 karakter).");
    if (mode === "ubah" && nominal <= 0) return setErr("Nominal pengganti harus lebih dari 0.");
    const base = { ...t, id: uid(), koreksi_dari: t.id, alasan_koreksi: alasan.trim(), dicatat_oleh: saya!.id, created_at: new Date().toISOString(), tanggal: tglKoreksi };
    try {
      transaksi(
        (d) => {
          d.transaksi.push({ ...base, nominal: -t.nominal, sumber: "koreksi", keterangan: `Pembalik: ${t.keterangan}` });
          if (mode === "ubah") {
            d.transaksi.push({ ...base, id: uid(), nominal, kategori_id: kategori, kantong_id: kantong, keterangan: ket.trim() || t.keterangan });
          }
        },
        { aksi: mode === "batal" ? `Membatalkan transaksi: ${alasan}` : `Mengoreksi transaksi: ${alasan}`, entitas: "transaksi", entitas_id: t.id },
      );
    } catch (e) {
      return setErr((e as Error).message);
    }
    setKoreksi(false);
    toast("Koreksi tersimpan, jejak audit tetap utuh");
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <div className="w-44 shrink-0 text-muted">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Detail transaksi" back="/app/kas" action={bolehKoreksi && <Button variant="secondary" onClick={() => setKoreksi(true)}>Koreksi</Button>} />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={t.arah === "masuk" ? "green" : "red"}>Kas {t.arah}</Badge>
          {t.nominal < 0 && <Badge>Pembalik koreksi</Badge>}
          {dikoreksi && <Badge tone="amber">Sudah dikoreksi</Badge>}
          {periodeTerkunci(db, t.tanggal) && (
            <Badge tone="gold">
              <Lock size={12} /> Tutup buku
            </Badge>
          )}
        </div>
        <div className={cx("num mt-3 text-[2rem] font-bold tracking-tight", dikoreksi && "line-through opacity-60")}>{rupiah(t.nominal)}</div>
        <div className="text-lg font-semibold">{t.keterangan}</div>

        <div className="mt-4 divide-y divide-line border-t border-line">
          <Row label="Tanggal">{tanggal(t.tanggal, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Row>
          <Row label="Kategori">{kat?.nama}</Row>
          <Row label="Kantong dana">
            {ktg?.nama} {ktg?.jenis === "terikat" && <Badge tone="gold">terikat</Badge>}
          </Row>
          {t.pihak && <Row label={t.arah === "masuk" ? "Donatur / sumber" : "Penerima"}>{t.pihak}</Row>}
          <Row label="Sumber">
            {SUMBER[t.sumber]}
            {t.sumber === "kotak" && t.sumber_id && (
              <Link href={`/app/kotak-amal/${t.sumber_id}`} className="ml-2 text-brand">
                Lihat penghitungan
              </Link>
            )}
            {t.sumber === "pengajuan" && t.sumber_id && (
              <Link href={`/app/pengajuan/${t.sumber_id}`} className="ml-2 text-brand">
                Lihat pengajuan
              </Link>
            )}
          </Row>
          <Row label="Dicatat oleh">
            {nama(db, t.dicatat_oleh)} · {waktu(t.created_at)}
          </Row>
          {t.alasan_koreksi && <Row label="Alasan koreksi">{t.alasan_koreksi}</Row>}
          {asal && (
            <Row label="Koreksi dari">
              <Link href={`/app/kas/${asal.id}`} className="text-brand">
                {asal.keterangan} ({rupiah(asal.nominal)})
              </Link>
            </Row>
          )}
        </div>
      </Card>

      {t.bukti_url && (
        <Card className="mt-4 overflow-hidden">
          <div className="border-b border-line px-5 py-3 font-semibold">{t.arah === "keluar" ? "Foto nota" : "Bukti"}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.bukti_url} alt="Bukti transaksi" className="max-h-[480px] w-full bg-canvas object-contain" />
        </Card>
      )}

      {(terkait.length > 0 || log.length > 0) && (
        <Card className="mt-4 p-5">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <History size={18} /> Jejak audit
          </div>
          <ul className="space-y-2 text-sm">
            {terkait.map((x) => (
              <li key={x.id}>
                <Link href={`/app/kas/${x.id}`} className="text-brand">
                  {x.nominal < 0 ? "Pembalik" : "Pengganti"} {rupiah(x.nominal)}
                </Link>{" "}
                — {nama(db, x.dicatat_oleh)}, {waktu(x.created_at)}: “{x.alasan_koreksi}”
              </li>
            ))}
            {log.map((l) => (
              <li key={l.id} className="text-muted">
                {waktu(l.waktu)} — {nama(db, l.pengurus_id)}: {l.aksi}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={koreksi}
        onClose={() => setKoreksi(false)}
        title="Koreksi transaksi"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setKoreksi(false)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={simpanKoreksi}>
              Simpan koreksi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Transaksi asli tidak dihapus. Sistem membuat transaksi pembalik{mode === "ubah" ? " dan transaksi pengganti" : ""} bertanggal {tanggal(tglKoreksi)}.
          </p>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "ubah", label: "Perbaiki nilai" },
              { value: "batal", label: "Batalkan" },
            ]}
          />
          <Field label="Alasan koreksi (wajib)">
            <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: salah ketik nominal, seharusnya Rp150.000" rows={2} />
          </Field>
          {mode === "ubah" && (
            <>
              <Field label="Nominal yang benar">
                <NominalInput value={nominal} onChange={setNominal} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kategori">
                  <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                    {db.kategori
                      .filter((k) => k.arah === t.arah && !k.sistem?.startsWith("transfer"))
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Kantong dana">
                  <Select value={kantong} onChange={(e) => setKantong(e.target.value)}>
                    {db.kantong.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Keterangan">
                <Textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={2} />
              </Field>
            </>
          )}
          {err && <p className="rounded-xl bg-keluar-soft p-3 font-medium text-keluar">{err}</p>}
        </div>
      </Modal>
    </div>
  );
}
