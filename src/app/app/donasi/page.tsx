"use client";

import { useState } from "react";
import { MessageCircle, Printer, QrCode, ShieldCheck, ExternalLink } from "lucide-react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { STATUS_DONASI } from "@/lib/label";
import { kategoriSistem, periodeTerkunci, pesanKwitansi } from "@/lib/logic";
import { rupiah, today, uid, waLink, waktu } from "@/lib/format";
import type { Donasi } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Modal, PageHeader, Segmented, Textarea, useToast } from "@/components/ui";

export default function DonasiAdmin() {
  const { db, saya, transaksi } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Donasi["status"]>("menunggu");
  const [tolak, setTolak] = useState<Donasi | null>(null);
  const [alasan, setAlasan] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  const tujuan = (d: Donasi) => (d.program_id ? db.program.find((p) => p.id === d.program_id)?.nama : db.kantong.find((k) => k.id === d.kantong_id)?.nama) ?? "";
  const list = db.donasi.filter((d) => d.status === tab).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const n = (s: Donasi["status"]) => db.donasi.filter((d) => d.status === s).length;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const verifikasi = (d: Donasi) => {
    const kat = kategoriSistem(db, "donasi_qris");
    const tgl = periodeTerkunci(db, d.created_at.slice(0, 10)) ? today() : d.created_at.slice(0, 10);
    const tid = uid();
    transaksi(
      (draft) => {
        draft.transaksi.push({
          id: tid,
          kantong_id: d.kantong_id,
          kategori_id: kat!.id,
          arah: "masuk",
          tanggal: tgl,
          nominal: d.nominal,
          keterangan: d.program_id ? `Donasi program ${tujuan(d)}` : "Donasi QRIS",
          pihak: d.anonim ? "Hamba Allah" : d.nama_donatur || "Hamba Allah",
          bukti_url: d.bukti_url,
          sumber: "donasi",
          sumber_id: d.id,
          koreksi_dari: null,
          alasan_koreksi: null,
          dicatat_oleh: saya!.id,
          created_at: new Date().toISOString(),
        });
        Object.assign(draft.donasi.find((x) => x.id === d.id)!, { status: "terverifikasi", transaksi_id: tid, diverifikasi_oleh: saya!.id });
      },
      { aksi: `Memverifikasi donasi ${rupiah(d.nominal)}`, entitas: "donasi", entitas_id: d.id },
    );
    toast("Donasi terverifikasi & tercatat di kas");
  };

  if (!bisa.lihatDataDonatur(saya)) {
    return (
      <div>
        <PageHeader title="Donasi QRIS" />
        <Card className="p-6">
          <div className="flex gap-3">
            <ShieldCheck className="shrink-0 text-gold" />
            <p className="text-ink-2">Data donatur (nama & nomor WhatsApp) hanya dapat dilihat Bendahara dan Ketua DKM, sesuai prinsip UU Pelindungan Data Pribadi.</p>
          </div>
          <div className="mt-4 text-muted">
            {n("menunggu")} donasi menunggu verifikasi · {n("terverifikasi")} terverifikasi
          </div>
          <Button href="/app/donasi/poster" variant="secondary" className="mt-4">
            <QrCode size={18} /> Poster QR donasi
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Donasi QRIS"
        subtitle="Cocokkan dengan mutasi rekening/QRIS sebelum memverifikasi."
        action={
          <>
            <Button href="/donasi" variant="secondary">
              <ExternalLink size={18} /> Halaman donasi
            </Button>
            <Button href="/app/donasi/poster" variant="secondary">
              <Printer size={18} /> Poster QR
            </Button>
          </>
        }
      />
      <div className="mb-4 max-w-lg">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "menunggu", label: `Menunggu (${n("menunggu")})` },
            { value: "terverifikasi", label: "Terverifikasi" },
            { value: "ditolak", label: "Ditolak" },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty icon={<ShieldCheck />} title="Tidak ada donasi di sini" />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.slice(0, 60).map((d) => (
            <Card key={d.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="num text-xl font-bold">{rupiah(d.nominal)}</div>
                  <div className="font-semibold">
                    {d.nama_donatur || "Tanpa nama"} {d.anonim && <Badge>tampil Hamba Allah</Badge>}
                  </div>
                </div>
                <Badge tone={STATUS_DONASI[d.status].tone}>{STATUS_DONASI[d.status].label}</Badge>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-muted">
                <div>Untuk: {tujuan(d)}</div>
                <div>{waktu(d.created_at)}</div>
                {d.no_wa && <div>WA: {d.no_wa}</div>}
                {d.doa && <div className="text-ink-2">Doa: “{d.doa}”</div>}
                {d.status === "ditolak" && <div className="text-keluar">Alasan: {d.alasan_tolak}</div>}
                {d.status === "terverifikasi" && d.diverifikasi_oleh && <div>Diverifikasi {nama(db, d.diverifikasi_oleh)}</div>}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {d.bukti_url ? (
                  <Button size="sm" variant="secondary" onClick={() => setFoto(d.bukti_url)}>
                    Lihat bukti
                  </Button>
                ) : (
                  <span className="self-center text-sm text-muted">Tanpa foto bukti</span>
                )}
                {d.status === "menunggu" && (
                  <>
                    <Button size="sm" variant="danger" onClick={() => setTolak(d)}>
                      Tolak
                    </Button>
                    <Button size="sm" onClick={() => verifikasi(d)}>
                      Verifikasi
                    </Button>
                  </>
                )}
                {d.status === "terverifikasi" && (
                  <>
                    <Button size="sm" variant="secondary" href={`/kwitansi/${d.id}`}>
                      Kwitansi
                    </Button>
                    {d.no_wa && (
                      <a
                        href={waLink(d.no_wa, pesanKwitansi(d, db.masjid.nama, `${origin}/kwitansi/${d.id}`))}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1f9d55] px-3 text-sm font-semibold text-white"
                      >
                        <MessageCircle size={16} /> Kirim via WA
                      </a>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!foto} onClose={() => setFoto(null)} title="Bukti transfer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {foto && <img src={foto} alt="Bukti transfer" className="w-full rounded-xl" />}
      </Modal>

      <Modal
        open={!!tolak}
        onClose={() => setTolak(null)}
        title="Tolak donasi"
        footer={
          <Button
            variant="danger"
            className="flex-1"
            disabled={alasan.trim().length < 3}
            onClick={() => {
              transaksi((d) => Object.assign(d.donasi.find((x) => x.id === tolak!.id)!, { status: "ditolak", alasan_tolak: alasan.trim(), diverifikasi_oleh: saya!.id }), {
                aksi: `Menolak donasi: ${alasan}`,
                entitas: "donasi",
                entitas_id: tolak!.id,
              });
              setTolak(null);
              setAlasan("");
              toast("Donasi ditolak");
            }}
          >
            Tolak donasi
          </Button>
        }
      >
        <Field label="Alasan" hint="Akan terlihat oleh donatur di halaman status donasinya.">
          <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: dana tidak ditemukan di mutasi rekening" />
        </Field>
      </Modal>
    </div>
  );
}
