"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card, PageHeader, useToast } from "@/components/ui";
import { QR } from "@/components/qr";

export default function Poster() {
  const { db } = useStore();
  const toast = useToast();
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(`${window.location.origin}/donasi`), []);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Poster QR donasi"
          subtitle="Cetak dan tempel di masjid, atau bagikan link-nya ke grup WhatsApp jamaah."
          back="/app/donasi"
          action={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(url);
                  toast("Link donasi disalin");
                }}
              >
                <Copy size={18} /> Salin link
              </Button>
              <Button onClick={() => window.print()}>
                <Printer size={18} /> Cetak
              </Button>
            </>
          }
        />
      </div>
      <Card className="print-full mx-auto max-w-[560px] p-10 text-center">
        <Image src="/logo.png" alt="Logo Masjid Al Misbah" width={96} height={96} className="mx-auto rounded-2xl" />
        <div className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-gold">Infak & Sedekah</div>
        <h1 className="mt-2 font-serif text-4xl font-bold">{db.masjid.nama}</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-2">Pindai untuk berdonasi lewat QRIS dan dapatkan kwitansi digital langsung di WhatsApp Anda.</p>
        <div className="mx-auto mt-8 inline-block rounded-3xl border border-line p-5">{url && <QR value={url} size={240} />}</div>
        <div className="mt-4 font-mono text-sm text-muted">{url.replace(/^https?:\/\//, "")}</div>
        <div className="mx-auto mt-8 max-w-sm border-t border-line pt-5 text-sm text-muted">
          Atau transfer ke
          <div className="mt-1 font-semibold text-ink">{db.masjid.rekening}</div>
        </div>
        <p className="mt-8 font-serif text-lg italic text-ink-2">“Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai…”</p>
        <p className="mt-1 text-sm text-muted">QS. Al-Baqarah: 261</p>
      </Card>
    </div>
  );
}
