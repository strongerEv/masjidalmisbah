"use client";

import { useState } from "react";
import { History, Pencil, Plus, RotateCcw, UserPlus } from "lucide-react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { JABATAN_LABEL, rupiah, tanggal, uid, waktu } from "@/lib/format";
import type { Jabatan, Kategori, Pengurus, Program } from "@/lib/types";
import { Avatar } from "@/components/app-shell";
import { Progress } from "@/components/chart";
import { Badge, Button, Card, Field, FotoInput, Input, Modal, NominalInput, PageHeader, SectionTitle, Segmented, Select, Textarea, Toggle, useToast } from "@/components/ui";

export default function Pengaturan() {
  const { saya } = useStore();
  return (
    <div className="space-y-10">
      <PageHeader title="Pengaturan" subtitle="Profil masjid, pengurus, kategori, program donasi, dan log aktivitas." />
      {bisa.kelolaMaster(saya) && <ProfilMasjid />}
      <PengurusSection />
      {bisa.kelolaMaster(saya) && <KategoriSection />}
      {bisa.kelolaMaster(saya) && <ProgramSection />}
      <LogSection />
      <DemoSection />
    </div>
  );
}

function ProfilMasjid() {
  const { db, updateMasjid } = useStore();
  const toast = useToast();
  const [m, setM] = useState(db.masjid);
  return (
    <section>
      <SectionTitle>Profil masjid</SectionTitle>
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nama masjid">
            <Input value={m.nama} onChange={(e) => setM({ ...m, nama: e.target.value })} />
          </Field>
          <Field label="Batas pengeluaran wajib persetujuan Ketua">
            <NominalInput value={m.batas_persetujuan} onChange={(n) => setM({ ...m, batas_persetujuan: n })} />
          </Field>
        </div>
        <Field label="Alamat">
          <Textarea value={m.alamat} onChange={(e) => setM({ ...m, alamat: e.target.value })} rows={2} />
        </Field>
        <Field label="Rekening masjid" hint="Ditampilkan di halaman donasi">
          <Input value={m.rekening} onChange={(e) => setM({ ...m, rekening: e.target.value })} />
        </Field>
        <Field label="Gambar QRIS statis masjid" hint="Unggah QRIS resmi atas nama masjid/yayasan">
          <div className="max-w-xs">
            <FotoInput value={m.qris_statis} onChange={(v) => setM({ ...m, qris_statis: v })} label="Unggah gambar QRIS" />
          </div>
        </Field>
        <Toggle
          checked={m.tampilkan_saldo_publik}
          onChange={(v) => setM({ ...m, tampilkan_saldo_publik: v })}
          label="Tampilkan saldo per kantong di halaman jamaah"
          hint="Jika dimatikan, halaman publik hanya menampilkan ringkasan bulanan."
        />
        <Button
          onClick={() => {
            updateMasjid(m);
            toast("Profil masjid tersimpan");
          }}
        >
          Simpan perubahan
        </Button>
      </Card>
    </section>
  );
}

function PengurusSection() {
  const { db, saya, insert, update } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Pengurus> | null>(null);
  const kelola = bisa.kelolaPengurus(saya);
  return (
    <section>
      <SectionTitle
        action={
          kelola && (
            <Button size="sm" variant="secondary" onClick={() => setForm({ jabatan: "pengurus" })}>
              <UserPlus size={16} /> Undang pengurus
            </Button>
          )
        }
      >
        Pengurus & hak akses
      </SectionTitle>
      <Card className="divide-y divide-line">
        {db.pengurus.map((p) => (
          <div key={p.id} className={`flex flex-wrap items-center gap-3 p-4 ${p.aktif ? "" : "opacity-55"}`}>
            <Avatar nama={p.nama} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                {p.nama} {p.id === saya?.id && <Badge tone="blue">Anda</Badge>}
              </div>
              <div className="truncate text-sm text-muted">
                {p.no_hp} · {p.email}
              </div>
            </div>
            <Badge tone={p.jabatan === "ketua" ? "gold" : p.jabatan === "bendahara" ? "green" : "neutral"}>{JABATAN_LABEL[p.jabatan]}</Badge>
            {!p.aktif && <Badge tone="red">Akses dicabut</Badge>}
            {kelola && p.id !== saya?.id && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setForm(p)} aria-label="Ubah">
                  <Pencil size={16} />
                </Button>
                <Button
                  size="sm"
                  variant={p.aktif ? "danger" : "secondary"}
                  onClick={() => {
                    update("pengurus", p.id, { aktif: !p.aktif }, `${p.aktif ? "Mencabut" : "Memulihkan"} akses ${p.nama}`);
                    toast(p.aktif ? "Akses dicabut. Riwayat transaksinya tetap tersimpan." : "Akses dipulihkan");
                  }}
                >
                  {p.aktif ? "Cabut akses" : "Pulihkan"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>
      <div className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-3">
        <div><b className="text-ink-2">Ketua DKM:</b> melihat semua, menyetujui pengeluaran besar & transfer kantong, mengelola pengurus.</div>
        <div><b className="text-ink-2">Bendahara:</b> mencatat kas, verifikasi donasi, menghitung kotak amal, laporan & tutup buku.</div>
        <div><b className="text-ink-2">Pengurus:</b> melihat laporan, menjadi saksi kotak amal, mengajukan kebutuhan dana.</div>
      </div>
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Ubah pengurus" : "Undang pengurus"}
        footer={
          <Button
            className="flex-1"
            disabled={!form?.nama?.trim() || !(form?.no_hp?.trim() || form?.email?.trim())}
            onClick={() => {
              if (!form) return;
              if (form.id) update("pengurus", form.id, { nama: form.nama!.trim(), no_hp: form.no_hp ?? "", email: form.email ?? "", jabatan: form.jabatan }, `Mengubah data pengurus ${form.nama}`);
              else
                insert(
                  "pengurus",
                  { id: uid(), user_id: null, nama: form.nama!.trim(), no_hp: form.no_hp?.trim() ?? "", email: form.email?.trim() ?? "", jabatan: form.jabatan ?? "pengurus", aktif: true, created_at: new Date().toISOString() },
                  `Mengundang ${form.nama} sebagai ${JABATAN_LABEL[form.jabatan ?? "pengurus"]}`,
                );
              setForm(null);
              toast(form.id ? "Data pengurus diperbarui" : "Undangan dibuat. Pengurus bisa masuk dengan nomor HP / email tersebut.");
            }}
          >
            Simpan
          </Button>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Nama">
              <Input value={form.nama ?? ""} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </Field>
            <Field label="Nomor HP">
              <Input inputMode="tel" value={form.no_hp ?? ""} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Jabatan">
              <Select value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value as Jabatan })}>
                {(["ketua", "bendahara", "pengurus"] as const).map((j) => (
                  <option key={j} value={j}>
                    {JABATAN_LABEL[j]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </section>
  );
}

function KategoriSection() {
  const { db, insert, update } = useStore();
  const [form, setForm] = useState<Partial<Kategori> | null>(null);
  return (
    <section id="kategori">
      <SectionTitle
        action={
          <Button size="sm" variant="secondary" onClick={() => setForm({ arah: "masuk" })}>
            <Plus size={16} /> Kategori
          </Button>
        }
      >
        Kategori transaksi
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {(["masuk", "keluar"] as const).map((a) => (
          <Card key={a} className="p-4">
            <div className="mb-2 font-semibold">{a === "masuk" ? "Kas masuk" : "Kas keluar"}</div>
            <div className="flex flex-wrap gap-2">
              {db.kategori
                .filter((k) => k.arah === a)
                .map((k) => (
                  <button
                    key={k.id}
                    disabled={!!k.sistem?.startsWith("transfer")}
                    onClick={() => setForm(k)}
                    className={`rounded-full border border-line px-3 py-1.5 text-sm font-medium transition hover:border-line-2 disabled:cursor-default ${k.aktif ? "" : "line-through opacity-50"}`}
                  >
                    {k.nama}
                  </button>
                ))}
            </div>
          </Card>
        ))}
      </div>
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Ubah kategori" : "Kategori baru"}
        footer={
          <>
            {form?.id && !form.sistem && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  update("kategori", form.id!, { aktif: !form.aktif }, `${form.aktif ? "Menonaktifkan" : "Mengaktifkan"} kategori ${form.nama}`);
                  setForm(null);
                }}
              >
                {form.aktif ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={!form?.nama?.trim()}
              onClick={() => {
                if (form?.id) update("kategori", form.id, { nama: form.nama!.trim() }, `Mengubah kategori ${form.nama}`);
                else insert("kategori", { id: uid(), nama: form!.nama!.trim(), arah: form!.arah ?? "masuk", sistem: null, aktif: true }, `Menambah kategori ${form!.nama}`);
                setForm(null);
              }}
            >
              Simpan
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            {!form.id && (
              <Segmented
                value={form.arah ?? "masuk"}
                onChange={(v) => setForm({ ...form, arah: v })}
                options={[
                  { value: "masuk", label: "Kas masuk" },
                  { value: "keluar", label: "Kas keluar" },
                ]}
              />
            )}
            <Field label="Nama kategori">
              <Input value={form.nama ?? ""} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </section>
  );
}

function ProgramSection() {
  const { db, insert, update } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Program> | null>(null);
  return (
    <section>
      <SectionTitle
        action={
          <Button size="sm" variant="secondary" onClick={() => setForm({ kantong_id: db.kantong[1]?.id, target: 0 })}>
            <Plus size={16} /> Program
          </Button>
        }
      >
        Program penggalangan dana
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {db.program.map((p) => {
          const ds = db.donasi.filter((d) => d.program_id === p.id && d.status === "terverifikasi");
          const t = ds.reduce((a, d) => a + d.nominal, 0);
          return (
            <Card key={p.id} className={`p-5 ${p.aktif ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{p.nama}</div>
                {!p.aktif && <Badge>selesai</Badge>}
              </div>
              <div className="mt-1 text-sm text-muted">{p.deskripsi}</div>
              <div className="mt-4">
                <Progress value={t} max={p.target} />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="num font-semibold">{rupiah(t)}</span>
                <span className="text-muted">
                  dari {rupiah(p.target)} · {ds.length} donatur
                </span>
              </div>
              <div className="mt-1 text-sm text-muted">
                {db.kantong.find((k) => k.id === p.kantong_id)?.nama} {p.tenggat && `· s.d. ${tanggal(p.tenggat)}`}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setForm(p)}>
                  Ubah
                </Button>
                <Button size="sm" variant="ghost" onClick={() => update("program", p.id, { aktif: !p.aktif }, `${p.aktif ? "Menutup" : "Membuka"} program ${p.nama}`)}>
                  {p.aktif ? "Tutup program" : "Buka lagi"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Ubah program" : "Program baru"}
        footer={
          <Button
            className="flex-1"
            disabled={!form?.nama?.trim() || !form?.target}
            onClick={() => {
              const data = { nama: form!.nama!.trim(), deskripsi: form!.deskripsi ?? "", target: form!.target!, tenggat: form!.tenggat || null, kantong_id: form!.kantong_id! };
              if (form!.id) update("program", form!.id, data, `Mengubah program ${data.nama}`);
              else insert("program", { id: uid(), foto_url: null, aktif: true, ...data }, `Membuat program ${data.nama}`);
              setForm(null);
              toast("Program tersimpan");
            }}
          >
            Simpan
          </Button>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Nama program">
              <Input value={form.nama ?? ""} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Renovasi atap masjid" />
            </Field>
            <Field label="Deskripsi">
              <Textarea value={form.deskripsi ?? ""} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </Field>
            <Field label="Target dana">
              <NominalInput value={form.target ?? 0} onChange={(n) => setForm({ ...form, target: n })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Batas waktu">
                <Input type="date" value={form.tenggat ?? ""} onChange={(e) => setForm({ ...form, tenggat: e.target.value })} />
              </Field>
              <Field label="Kantong dana">
                <Select value={form.kantong_id} onChange={(e) => setForm({ ...form, kantong_id: e.target.value })}>
                  {db.kantong.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

function LogSection() {
  const { db } = useStore();
  const [n, setN] = useState(15);
  return (
    <section>
      <SectionTitle>Log aktivitas</SectionTitle>
      <Card className="divide-y divide-line">
        {db.log_aktivitas.length === 0 && (
          <div className="flex items-center gap-3 p-5 text-muted">
            <History size={18} /> Belum ada aktivitas tercatat di perangkat ini.
          </div>
        )}
        {db.log_aktivitas.slice(0, n).map((l) => (
          <div key={l.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 p-4">
            <div>
              <b>{nama(db, l.pengurus_id)}</b> <span className="text-ink-2">{l.aksi}</span>
            </div>
            <div className="text-sm text-muted">{waktu(l.waktu)}</div>
          </div>
        ))}
      </Card>
      {db.log_aktivitas.length > n && (
        <Button variant="ghost" className="mt-2" onClick={() => setN(n + 30)}>
          Tampilkan lebih banyak
        </Button>
      )}
    </section>
  );
}

function DemoSection() {
  const { setelUlang } = useStore();
  const toast = useToast();
  return (
    <section>
      <SectionTitle>Mode demo</SectionTitle>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="max-w-xl text-ink-2">Data tersimpan di browser perangkat ini. Setel ulang untuk kembali ke data contoh awal.</p>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Setel ulang semua data demo di perangkat ini?")) {
              setelUlang();
              toast("Data demo disetel ulang");
            }
          }}
        >
          <RotateCcw size={18} /> Setel ulang data
        </Button>
      </Card>
    </section>
  );
}
