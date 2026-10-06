"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, Lock, Plus, Unlock } from "lucide-react";
import { useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { ringkasanPeriode, saldoKantong, saldoTotal } from "@/lib/logic";
import { rupiah, today, uid } from "@/lib/format";
import type { Kantong } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Modal, NominalInput, PageHeader, Segmented, Textarea, useToast } from "@/components/ui";

export default function KantongDana() {
  const { db, saya, insert, update } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<Kantong> | null>(null);
  const now = today();
  const bulan = ringkasanPeriode(db, now.slice(0, 8) + "01", now);
  const total = saldoTotal(db);

  const simpan = () => {
    if (!edit?.nama?.trim()) return;
    if (edit.id) {
      update("kantong", edit.id, { nama: edit.nama.trim(), deskripsi: edit.deskripsi ?? "", jenis: edit.jenis }, `Mengubah kantong ${edit.nama}`);
    } else {
      insert(
        "kantong",
        { id: uid(), nama: edit.nama.trim(), jenis: edit.jenis ?? "terikat", deskripsi: edit.deskripsi ?? "", saldo_awal: edit.saldo_awal ?? 0, aktif: true, urutan: db.kantong.length + 1 },
        `Membuat kantong ${edit.nama}`,
      );
    }
    setEdit(null);
    toast("Kantong dana tersimpan");
  };

  return (
    <div>
      <PageHeader
        title="Kantong Dana"
        subtitle="Saldo tiap tujuan dana terpisah. Dana terikat hanya untuk tujuannya."
        action={
          <>
            {bisa.catatKas(saya) && (
              <Button variant="secondary" href="/app/pengajuan/baru?jenis=transfer">
                <ArrowLeftRight size={18} /> Transfer
              </Button>
            )}
            {bisa.kelolaMaster(saya) && (
              <Button onClick={() => setEdit({ jenis: "terikat", saldo_awal: 0 })}>
                <Plus size={18} /> Kantong baru
              </Button>
            )}
          </>
        }
      />
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-muted">Total semua kantong</div>
          <div className="num text-3xl font-bold tracking-tight">{rupiah(total)}</div>
        </div>
        <div className="flex gap-2">
          <Badge tone="gold">
            <Lock size={12} /> Terikat: {rupiah(db.kantong.filter((k) => k.jenis === "terikat").reduce((a, k) => a + saldoKantong(db, k.id), 0))}
          </Badge>
          <Badge>
            <Unlock size={12} /> Bebas: {rupiah(db.kantong.filter((k) => k.jenis === "bebas").reduce((a, k) => a + saldoKantong(db, k.id), 0))}
          </Badge>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {[...db.kantong]
          .sort((a, b) => a.urutan - b.urutan)
          .map((k) => {
            const s = saldoKantong(db, k.id);
            const b = bulan.baris.find((x) => x.kantong.id === k.id);
            return (
              <Card key={k.id} className={k.aktif ? "p-5" : "p-5 opacity-60"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                      {k.nama}
                      {!k.aktif && <Badge>nonaktif</Badge>}
                    </div>
                    <div className="mt-0.5 text-sm text-muted">{k.deskripsi}</div>
                  </div>
                  <Badge tone={k.jenis === "terikat" ? "gold" : "neutral"}>
                    {k.jenis === "terikat" ? <Lock size={12} /> : <Unlock size={12} />} {k.jenis}
                  </Badge>
                </div>
                <div className="num mt-4 text-2xl font-bold">{rupiah(s)}</div>
                <div className="mt-1 flex gap-4 text-sm">
                  <span className="text-masuk">+{rupiah(b?.masuk ?? 0)}</span>
                  <span className="text-keluar">−{rupiah(b?.keluar ?? 0)}</span>
                  <span className="text-muted">bulan ini</span>
                </div>
                <div className="mt-4 flex gap-2 border-t border-line pt-4">
                  <Button size="sm" variant="secondary" href={`/app/kas?kantong=${k.id}`}>
                    Lihat transaksi
                  </Button>
                  {bisa.kelolaMaster(saya) && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEdit(k)}>
                        Ubah
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (k.aktif && s !== 0) return toast("Kosongkan saldo (transfer) sebelum menonaktifkan", "err");
                          update("kantong", k.id, { aktif: !k.aktif }, `${k.aktif ? "Menonaktifkan" : "Mengaktifkan"} kantong ${k.nama}`);
                        }}
                      >
                        {k.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
      </div>
      <p className="mt-6 text-sm text-muted">
        Transfer antar kantong memerlukan persetujuan Ketua DKM. Lihat <Link href="/app/pengajuan" className="font-semibold text-brand">pengajuan</Link>.
      </p>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Ubah kantong" : "Kantong dana baru"}
        footer={
          <Button className="flex-1" onClick={simpan} disabled={!edit?.nama?.trim()}>
            Simpan
          </Button>
        }
      >
        {edit && (
          <div className="space-y-4">
            <Field label="Nama kantong">
              <Input value={edit.nama ?? ""} onChange={(e) => setEdit({ ...edit, nama: e.target.value })} placeholder="Contoh: Wakaf Al-Qur'an" />
            </Field>
            <Field label="Jenis">
              <Segmented
                value={edit.jenis ?? "terikat"}
                onChange={(v) => setEdit({ ...edit, jenis: v })}
                options={[
                  { value: "terikat", label: "Terikat (khusus tujuan)" },
                  { value: "bebas", label: "Bebas (operasional)" },
                ]}
              />
            </Field>
            <Field label="Tujuan dana">
              <Textarea value={edit.deskripsi ?? ""} onChange={(e) => setEdit({ ...edit, deskripsi: e.target.value })} rows={2} />
            </Field>
            {!edit.id && (
              <Field label="Saldo awal" hint="Saldo saat mulai memakai aplikasi">
                <NominalInput value={edit.saldo_awal ?? 0} onChange={(n) => setEdit({ ...edit, saldo_awal: n })} />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
