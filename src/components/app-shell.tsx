"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Box,
  ClipboardCheck,
  FileText,
  HandHeart,
  Home,
  LayoutGrid,
  LogOut,
  PiggyBank,
  Settings,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { daftarTindakan } from "@/lib/tindakan";
import { JABATAN_LABEL } from "@/lib/format";
import { Modal, Spinner, cx } from "./ui";

const NAV = [
  { href: "/app", label: "Beranda", icon: Home },
  { href: "/app/kas", label: "Kas", icon: Wallet },
  { href: "/app/kotak-amal", label: "Kotak Amal", icon: Box },
  { href: "/app/donasi", label: "Donasi", icon: HandHeart },
  { href: "/app/pengajuan", label: "Pengajuan", icon: ClipboardCheck },
  { href: "/app/kantong", label: "Kantong Dana", icon: PiggyBank },
  { href: "/app/laporan", label: "Laporan", icon: FileText },
  { href: "/app/pengaturan", label: "Pengaturan", icon: Settings },
];

const BOTTOM = ["/app", "/app/kas", "/app/kotak-amal", "/app/laporan"];

function aktif(path: string, href: string) {
  return href === "/app" ? path === "/app" : path === href || path.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { siap, saya, db, keluar } = useStore();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (siap && !saya) router.replace(`/masuk?ke=${encodeURIComponent(path)}`);
  }, [siap, saya, router, path]);

  if (!siap || !saya) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const nTindakan = daftarTindakan(db, saya).length;
  const keluarAkun = () => {
    keluar();
    router.replace("/masuk");
  };

  return (
    <div className="min-h-dvh lg:pl-72">
      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-line bg-surface lg:flex">
        <Link href="/app" className="flex items-center gap-3 px-6 pb-6 pt-7">
          <Image src="/logo.png" alt="" width={44} height={44} className="rounded-xl" />
          <div>
            <div className="font-serif text-lg font-bold leading-tight">Al Misbah</div>
            <div className="text-sm text-muted">Keuangan & Donasi</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((n) => {
            const on = aktif(path, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx("flex h-11 items-center gap-3 rounded-xl px-3 font-semibold transition", on ? "bg-black/[0.05] text-ink" : "text-muted hover:bg-black/[0.03] hover:text-ink")}
              >
                <n.icon size={20} strokeWidth={on ? 2.3 : 2} className={on ? "text-brand" : ""} />
                {n.label}
                {n.href === "/app" && nTindakan > 0 && <span className="ml-auto rounded-full bg-gold px-2 text-xs font-bold leading-5 text-white">{nTindakan}</span>}
              </Link>
            );
          })}
          <Link href="/transparansi" target="_blank" className="flex h-11 items-center gap-3 rounded-xl px-3 font-semibold text-muted hover:bg-black/[0.03] hover:text-ink">
            <ExternalLink size={20} /> Halaman jamaah
          </Link>
        </nav>
        <div className="m-3 rounded-2xl border border-line p-3">
          <div className="flex items-center gap-3">
            <Avatar nama={saya.nama} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{saya.nama}</div>
              <div className="text-sm text-muted">{JABATAN_LABEL[saya.jabatan]}</div>
            </div>
            <button onClick={keluarAkun} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-black/[0.05]" title="Keluar" aria-label="Keluar">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
        <Link href="/app" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
          <span className="font-serif text-lg font-bold">Al Misbah</span>
        </Link>
        <button onClick={() => setMenu(true)} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3">
          <Avatar nama={saya.nama} small />
          <span className="text-sm font-semibold">{JABATAN_LABEL[saya.jabatan]}</span>
        </button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>

      {/* Navigasi bawah mobile */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.filter((n) => BOTTOM.includes(n.href)).map((n) => {
            const on = aktif(path, n.href);
            return (
              <Link key={n.href} href={n.href} className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold", on ? "text-ink" : "text-muted")}>
                <n.icon size={22} strokeWidth={on ? 2.3 : 1.9} className={on ? "text-brand" : ""} />
                {n.label}
                {n.href === "/app" && nTindakan > 0 && <span className="absolute right-[calc(50%-1.2rem)] top-2 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-white" />}
              </Link>
            );
          })}
          <button onClick={() => setMenu(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold text-muted">
            <LayoutGrid size={22} strokeWidth={1.9} />
            Lainnya
          </button>
        </div>
      </nav>

      <Modal open={menu} onClose={() => setMenu(false)} title="Menu">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <Avatar nama={saya.nama} />
          <div>
            <div className="font-semibold">{saya.nama}</div>
            <div className="text-sm text-muted">{JABATAN_LABEL[saya.jabatan]}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="flex items-center gap-3 rounded-xl border border-line p-3 font-semibold">
              <n.icon size={20} className="text-brand" />
              {n.label}
            </Link>
          ))}
          <Link href="/transparansi" onClick={() => setMenu(false)} className="flex items-center gap-3 rounded-xl border border-line p-3 font-semibold">
            <ExternalLink size={20} className="text-brand" /> Halaman jamaah
          </Link>
          <button onClick={keluarAkun} className="flex items-center gap-3 rounded-xl border border-line p-3 font-semibold text-keluar">
            <LogOut size={20} /> Keluar
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function Avatar({ nama, small }: { nama: string; small?: boolean }) {
  const inisial = nama
    .replace(/^(H\.|Hj\.|Ust\.|Pak|Bu|Ibu)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-gold-soft font-bold text-gold", small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm")}>{inisial}</span>
  );
}
