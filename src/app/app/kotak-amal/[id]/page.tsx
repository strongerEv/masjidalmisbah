"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { STATUS_HITUNG } from "@/lib/label";
import { ribuan, rupiah, tanggal, waktu } from "@/lib/format";
import { Badge, Button, Card, Empty, Field, Modal, PageHeader, Textarea, useToast } from "@/components/ui";
import { Avatar } from "@/components/app-shell";

export default function DetailHitung() {
  const { id } = useParams<{ id: string }>();
  const { db, saya, update, transaksi } = useStore();
  const toast = useToast();
  const [tolak, setTolak] = useState(false);
  const [catatan, setCatatan] = useState("");
  const p = db.penghitungan.find((x) => x.id === id);
  if (!p) return <Empty title="Penghitungan tidak ditemukan" />;

  const kotak = db.kotak.find((k) => k.id === p.kotak_id);
  const saksi = db.saksi.filter((s) => s.penghitungan_id === p.id);
  const sayaSaksi = saksi.find((s) => s.pengurus_id === saya?.id && s.status === "menunggu" && p.status === "menunggu");
  const st = STATUS_HITUNG[p.status];

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={kotak?.nama ?? "Penghitungan"} subtitle={tanggal(p.tanggal, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} back="/app/kotak-amal" />

      {sayaSaksi && (
        <Card className="mb-4 border-gold/40 bg-gold-soft p-5">
          <div className="font-semibold">Anda dipilih sebagai saksi penghitungan ini.</div>
          <p className="mt-1 text-ink-2">Apakah total {rupiah(p.total)} sesuai dengan uang yang dihitung bersama?</p>
          <div className="mt-4 flex gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                update("saksi", sayaSaksi.id, { status: "setuju", waktu: new Date().toISOString() }, `Mengonfirmasi hitungan ${kotak?.nama} ${rupiah(p.total)}`);
                toast("Terima kasih, konfirmasi tersimpan");
              }}
            >
              Ya, sesuai
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => setTolak(true)}>
              Tidak sesuai
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <Badge tone={st.tone}>{st.label}</Badge>
        <div className="num mt-3 text-[2rem] font-bold tracking-tight">{rupiah(p.total)}</div>
        <div className="text-muted">
          Masuk ke kantong <b className="text-ink-2">{db.kantong.find((k) => k.id === kotak?.kantong_id)?.nama}</b>
          {p.transaksi_id && (
            <>
              {" · "}
              <Link href={`/app/kas/${p.transaksi_id}`} className="font-semibold text-brand">
                Lihat transaksi
              </Link>
            </>
          )}
        </div>

        {p.rincian_pecahan && (
          <div className="mt-5 rounded-xl border border-line">
            {Object.entries(p.rincian_pecahan)
              .sort((a, b) => (b[0] === "koin" ? -1 : a[0] === "koin" ? 1 : Number(b[0]) - Number(a[0])))
              .map(([d, n]) => (
                <div key={d} className="num flex justify-between border-b border-line px-4 py-2 last:border-0">
                  <span>{d === "koin" ? "Koin" : `${ribuan(Number(d))} × ${n}`}</span>
                  <span className="font-semibold">{rupiah(d === "koin" ? n : Number(d) * n)}</span>
                </div>
              ))}
          </div>
        )}

        <div className="mt-6 font-semibold">Penghitung</div>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-line p-3">
            <Avatar nama={nama(db, p.dicatat_oleh)} />
            <div className="flex-1">
              <div className="font-semibold">{nama(db, p.dicatat_oleh)}</div>
              <div className="text-sm text-muted">Pencatat · {waktu(p.created_at)}</div>
            </div>
            <CheckCircle2 className="text-masuk" />
          </div>
          {saksi.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <Avatar nama={nama(db, s.pengurus_id)} />
              <div className="flex-1">
                <div className="font-semibold">{nama(db, s.pengurus_id)}</div>
                <div className="text-sm text-muted">
                  Saksi · {s.status === "menunggu" ? "belum konfirmasi" : `${s.status === "setuju" ? "setuju" : "tidak sesuai"} · ${waktu(s.waktu!)}`}
                </div>
                {s.catatan && <div className="mt-1 text-sm">“{s.catatan}”</div>}
              </div>
              {s.status === "setuju" ? <CheckCircle2 className="text-masuk" /> : s.status === "menunggu" ? <Clock className="text-warn" /> : <XCircle className="text-keluar" />}
            </div>
          ))}
        </div>

        {p.status === "dipersoalkan" && bisa.hitungKotak(saya) && (
          <div className="mt-5 rounded-xl bg-keluar-soft p-4">
            <p className="text-ink-2">Saksi menyatakan angka tidak sesuai. Batalkan sesi ini lalu hitung ulang bersama.</p>
            <Button
              variant="danger"
              className="mt-3"
              onClick={() => {
                transaksi((d) => {
                  d.penghitungan.find((x) => x.id === p.id)!.status = "dibatalkan";
                }, { aksi: "Membatalkan penghitungan yang dipersoalkan", entitas: "penghitungan", entitas_id: p.id });
                toast("Sesi dibatalkan");
              }}
            >
              Batalkan & hitung ulang
            </Button>
          </div>
        )}
      </Card>

      <Modal
        open={tolak}
        onClose={() => setTolak(false)}
        title="Angka tidak sesuai"
        footer={
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (!sayaSaksi) return;
              transaksi(
                (d) => {
                  Object.assign(d.saksi.find((x) => x.id === sayaSaksi.id)!, { status: "tidak_sesuai", catatan: catatan.trim(), waktu: new Date().toISOString() });
                  d.penghitungan.find((x) => x.id === p.id)!.status = "dipersoalkan";
                },
                { aksi: `Menyatakan hitungan tidak sesuai: ${catatan}`, entitas: "penghitungan", entitas_id: p.id },
              );
              setTolak(false);
              toast("Catatan dikirim ke bendahara");
            }}
          >
            Kirim
          </Button>
        }
      >
        <Field label="Catatan untuk bendahara">
          <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: menurut saya totalnya Rp2.450.000" />
        </Field>
      </Modal>
    </div>
  );
}
