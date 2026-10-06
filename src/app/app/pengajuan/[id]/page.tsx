"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { STATUS_PENGAJUAN } from "@/lib/label";
import { kategoriSistem, periodeTerkunci, saldoKantong } from "@/lib/logic";
import { rupiah, tanggal, today, uid, waktu } from "@/lib/format";
import type { Transaksi } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, FotoInput, Input, Modal, NominalInput, PageHeader, Textarea, useToast } from "@/components/ui";

export default function DetailPengajuan() {
  const { id } = useParams<{ id: string }>();
  const { db, saya, transaksi } = useStore();
  const toast = useToast();
  const p = db.pengajuan.find((x) => x.id === id);
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [bayar, setBayar] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [penerima, setPenerima] = useState("");
  const [nominalBayar, setNominalBayar] = useState(p?.nominal ?? 0);
  const [tgl, setTgl] = useState(today());
  const [err, setErr] = useState<string | null>(null);
  if (!p) return <Empty title="Pengajuan tidak ditemukan" />;

  const st = STATUS_PENGAJUAN[p.status];
  const asal = db.kantong.find((k) => k.id === p.kantong_id);
  const tujuanK = db.kantong.find((k) => k.id === p.kantong_tujuan_id);
  const pembayaran = db.transaksi.filter((t) => t.sumber === "pengajuan" && t.sumber_id === p.id).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const transferTx = db.transaksi.filter((t) => t.sumber === "transfer" && t.sumber_id === p.id);

  const setujui = () => {
    setErr(null);
    if (p.jenis === "transfer") {
      if (saldoKantong(db, p.kantong_id) < p.nominal) return setErr("Saldo kantong asal tidak cukup.");
      const tgl = today();
      if (periodeTerkunci(db, tgl)) return setErr("Periode berjalan sudah tutup buku.");
      const base: Omit<Transaksi, "id" | "kantong_id" | "kategori_id" | "arah"> = {
        tanggal: tgl,
        nominal: p.nominal,
        keterangan: `Transfer ${asal?.nama} → ${tujuanK?.nama}: ${p.tujuan}`,
        pihak: "",
        bukti_url: null,
        sumber: "transfer",
        sumber_id: p.id,
        koreksi_dari: null,
        alasan_koreksi: null,
        dicatat_oleh: saya!.id,
        created_at: new Date().toISOString(),
      };
      transaksi(
        (d) => {
          d.transaksi.push({ ...base, id: uid(), kantong_id: p.kantong_id, kategori_id: kategoriSistem(d, "transfer_keluar")!.id, arah: "keluar" });
          d.transaksi.push({ ...base, id: uid(), kantong_id: p.kantong_tujuan_id!, kategori_id: kategoriSistem(d, "transfer_masuk")!.id, arah: "masuk" });
          Object.assign(d.pengajuan.find((x) => x.id === p.id)!, { status: "selesai", disetujui_oleh: saya!.id, waktu_keputusan: new Date().toISOString() });
        },
        { aksi: `Menyetujui transfer ${rupiah(p.nominal)}`, entitas: "pengajuan", entitas_id: p.id },
      );
    } else {
      transaksi((d) => Object.assign(d.pengajuan.find((x) => x.id === p.id)!, { status: "disetujui", disetujui_oleh: saya!.id, waktu_keputusan: new Date().toISOString() }), {
        aksi: `Menyetujui pengajuan ${rupiah(p.nominal)}`,
        entitas: "pengajuan",
        entitas_id: p.id,
      });
    }
    toast("Pengajuan disetujui");
  };

  const catatBayar = () => {
    setErr(null);
    if (!nota) return setErr("Foto nota wajib diunggah.");
    if (nominalBayar <= 0 || nominalBayar > p.nominal) return setErr(`Nominal harus antara Rp1 dan ${rupiah(p.nominal)} (yang disetujui).`);
    if (saldoKantong(db, p.kantong_id) < nominalBayar) return setErr("Saldo kantong tidak cukup.");
    try {
      transaksi(
        (d) => {
          d.transaksi.push({
            id: uid(),
            kantong_id: p.kantong_id,
            kategori_id: p.kategori_id!,
            arah: "keluar",
            tanggal: tgl,
            nominal: nominalBayar,
            keterangan: p.tujuan,
            pihak: penerima.trim(),
            bukti_url: nota,
            sumber: "pengajuan",
            sumber_id: p.id,
            koreksi_dari: null,
            alasan_koreksi: null,
            dicatat_oleh: saya!.id,
            created_at: new Date().toISOString(),
          });
          d.pengajuan.find((x) => x.id === p.id)!.status = "selesai";
        },
        { aksi: `Membayar pengajuan ${rupiah(nominalBayar)}`, entitas: "pengajuan", entitas_id: p.id },
      );
    } catch (e) {
      return setErr((e as Error).message);
    }
    setBayar(false);
    toast("Pembayaran tercatat sebagai kas keluar");
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <div className="w-40 shrink-0 text-muted">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={p.jenis === "transfer" ? "Transfer antar kantong" : "Pengajuan pengeluaran"} back="/app/pengajuan" />

      {p.status === "menunggu" && bisa.setujui(saya) && (
        <Card className="mb-4 border-gold/40 bg-gold-soft p-5">
          <div className="font-semibold">Menunggu keputusan Anda sebagai Ketua DKM</div>
          {err && <p className="mt-2 font-medium text-keluar">{err}</p>}
          <div className="mt-4 flex gap-3">
            <Button className="flex-1" onClick={setujui}>
              Setujui
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => setTolak(true)}>
              Tolak
            </Button>
          </div>
        </Card>
      )}

      {p.status === "disetujui" && !p.rutin && bisa.catatKas(saya) && (
        <Card className="mb-4 border-info/30 bg-info-soft p-5">
          <div className="font-semibold">Sudah disetujui. Setelah membayar, catat pembayarannya dan unggah foto nota.</div>
          <Button className="mt-4" onClick={() => setBayar(true)}>
            Catat pembayaran
          </Button>
        </Card>
      )}
      {p.status === "disetujui" && p.rutin && bisa.catatKas(saya) && (
        <Card className="mb-4 p-5">
          <div className="font-semibold">Pengeluaran rutin aktif</div>
          <p className="text-muted">Bayar tiap bulan maksimal {rupiah(p.nominal)} tanpa persetujuan ulang.</p>
          <Button className="mt-4" href={`/app/kas/baru?arah=keluar&rutin=${p.id}`}>
            Catat pembayaran bulan ini
          </Button>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone={st.tone}>{st.label}</Badge>
          {p.rutin && <Badge tone="blue">Rutin bulanan</Badge>}
        </div>
        <div className="num mt-3 text-[2rem] font-bold tracking-tight">{rupiah(p.nominal)}</div>
        <div className="text-lg font-semibold">{p.tujuan}</div>
        <div className="mt-4 divide-y divide-line border-t border-line">
          <Row label="Diajukan oleh">
            {nama(db, p.pengaju_id)} · {waktu(p.created_at)}
          </Row>
          <Row label={p.jenis === "transfer" ? "Dari kantong" : "Kantong dana"}>
            {asal?.nama} <span className="text-muted">(saldo {rupiah(saldoKantong(db, p.kantong_id))})</span>
          </Row>
          {tujuanK && <Row label="Ke kantong">{tujuanK.nama}</Row>}
          {p.kategori_id && <Row label="Kategori">{db.kategori.find((k) => k.id === p.kategori_id)?.nama}</Row>}
          {p.disetujui_oleh && (
            <Row label={p.status === "ditolak" ? "Ditolak oleh" : "Disetujui oleh"}>
              {nama(db, p.disetujui_oleh)} · {waktu(p.waktu_keputusan!)}
            </Row>
          )}
          {p.alasan && <Row label="Alasan penolakan">{p.alasan}</Row>}
        </div>
        {p.lampiran_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.lampiran_url} alt="Lampiran" className="mt-4 max-h-80 w-full rounded-xl border border-line bg-canvas object-contain" />
        )}
      </Card>

      {(pembayaran.length > 0 || transferTx.length > 0) && (
        <Card className="mt-4 divide-y divide-line">
          <div className="px-5 py-3 font-semibold">Transaksi terkait</div>
          {[...pembayaran, ...transferTx].map((t) => (
            <Link key={t.id} href={`/app/kas/${t.id}`} className="flex justify-between gap-4 px-5 py-3 hover:bg-canvas">
              <span>
                {tanggal(t.tanggal)} · {db.kantong.find((k) => k.id === t.kantong_id)?.nama} ({t.arah})
              </span>
              <span className="num font-semibold">{rupiah(t.nominal)}</span>
            </Link>
          ))}
        </Card>
      )}

      <Modal
        open={tolak}
        onClose={() => setTolak(false)}
        title="Tolak pengajuan"
        footer={
          <Button
            variant="danger"
            className="flex-1"
            disabled={alasan.trim().length < 3}
            onClick={() => {
              transaksi((d) => Object.assign(d.pengajuan.find((x) => x.id === p.id)!, { status: "ditolak", alasan: alasan.trim(), disetujui_oleh: saya!.id, waktu_keputusan: new Date().toISOString() }), {
                aksi: `Menolak pengajuan: ${alasan}`,
                entitas: "pengajuan",
                entitas_id: p.id,
              });
              setTolak(false);
              toast("Pengajuan ditolak");
            }}
          >
            Tolak
          </Button>
        }
      >
        <Field label="Alasan penolakan">
          <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: Minta 2 penawaran harga pembanding dulu" />
        </Field>
      </Modal>

      <Modal
        open={bayar}
        onClose={() => setBayar(false)}
        title="Catat pembayaran"
        footer={
          <Button className="flex-1" onClick={catatBayar}>
            Simpan sebagai kas keluar
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Nominal dibayar" hint={`Maksimal ${rupiah(p.nominal)}`}>
            <NominalInput value={nominalBayar} onChange={setNominalBayar} />
          </Field>
          <Field label="Tanggal">
            <Input type="date" value={tgl} max={today()} onChange={(e) => setTgl(e.target.value)} />
          </Field>
          <Field label="Penerima">
            <Input value={penerima} onChange={(e) => setPenerima(e.target.value)} placeholder="Nama toko / tukang" />
          </Field>
          <Field label="Foto nota (wajib)">
            <FotoInput value={nota} onChange={setNota} />
          </Field>
          {err && <p className="rounded-xl bg-keluar-soft p-3 font-medium text-keluar">{err}</p>}
        </div>
      </Modal>
    </div>
  );
}
