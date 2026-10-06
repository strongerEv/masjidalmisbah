"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, ChevronRight, ClipboardCheck, Plus, Repeat } from "lucide-react";
import { nama, useStore } from "@/lib/store";
import { bisa } from "@/lib/akses";
import { STATUS_PENGAJUAN } from "@/lib/label";
import { rupiah, tanggal } from "@/lib/format";
import type { Pengajuan } from "@/lib/types";
import { Badge, Button, Card, Empty, PageHeader, Segmented } from "@/components/ui";

export default function DaftarPengajuan() {
  const { db, saya } = useStore();
  const [tab, setTab] = useState<"aktif" | "rutin" | "semua">("aktif");
  const list = db.pengajuan
    .filter((p) => (tab === "aktif" ? p.status === "menunggu" || (p.status === "disetujui" && !p.rutin) : tab === "rutin" ? p.rutin : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <PageHeader
        title="Pengajuan dana"
        subtitle={`Pengeluaran di atas ${rupiah(db.masjid.batas_persetujuan)} dan transfer antar kantong wajib disetujui Ketua DKM.`}
        action={
          <>
            {bisa.catatKas(saya) && (
              <Button href="/app/pengajuan/baru?jenis=transfer" variant="secondary">
                <ArrowLeftRight size={18} /> Transfer kantong
              </Button>
            )}
            <Button href="/app/pengajuan/baru">
              <Plus size={18} /> Ajukan
            </Button>
          </>
        }
      />
      <div className="mb-4 max-w-md">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "aktif", label: "Berjalan" },
            { value: "rutin", label: "Rutin" },
            { value: "semua", label: "Semua" },
          ]}
        />
      </div>
      <Card className="divide-y divide-line">
        {list.length === 0 && <Empty icon={<ClipboardCheck />} title="Belum ada pengajuan" />}
        {list.map((p) => (
          <Baris key={p.id} p={p} pengaju={nama(db, p.pengaju_id)} />
        ))}
      </Card>
    </div>
  );
}

function Baris({ p, pengaju }: { p: Pengajuan; pengaju: string }) {
  const st = STATUS_PENGAJUAN[p.status];
  return (
    <Link href={`/app/pengajuan/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-canvas">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-ink-2">
        {p.jenis === "transfer" ? <ArrowLeftRight size={19} /> : p.rutin ? <Repeat size={19} /> : <ClipboardCheck size={19} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{p.tujuan}</div>
        <div className="text-sm text-muted">
          {pengaju} · {tanggal(p.created_at.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}
          {p.rutin && " · bulanan"}
        </div>
      </div>
      <div className="text-right">
        <div className="num font-bold">{rupiah(p.nominal)}</div>
        <Badge tone={p.rutin && p.status === "disetujui" ? "green" : st.tone}>{p.rutin && p.status === "disetujui" ? "Rutin aktif" : st.label}</Badge>
      </div>
      <ChevronRight size={18} className="text-muted" />
    </Link>
  );
}
