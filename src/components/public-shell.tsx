"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { Spinner, cx } from "./ui";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // Data dibaca dari penyimpanan browser; tunggu sampai siap agar tidak terjadi beda render server/klien.
  const { siap } = useStore();
  const link = (href: string, label: string) => (
    <Link href={href} className={cx("rounded-lg px-3 py-2 text-[0.95rem] font-semibold transition", path === href ? "text-ink" : "text-muted hover:text-ink")}>
      {label}
    </Link>
  );
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Logo Masjid Al Misbah" width={38} height={38} className="rounded-lg" />
            <span className="hidden font-serif text-lg font-bold sm:inline">Masjid Al Misbah</span>
          </Link>
          <nav className="flex items-center gap-1">
            {link("/transparansi", "Laporan")}
            {link("/donasi", "Donasi")}
            <Link href="/masuk" className="ml-1 inline-flex h-10 items-center rounded-xl border border-line-2 px-4 text-[0.95rem] font-semibold hover:bg-canvas">
              Pengurus
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {siap ? (
          children
        ) : (
          <div className="flex justify-center py-32">
            <Spinner />
          </div>
        )}
      </main>
      <footer className="no-print border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>© {new Date().getFullYear()} DKM Masjid Al Misbah · Dikelola secara amanah dan terbuka.</div>
          <div className="flex gap-4">
            <Link href="/transparansi" className="hover:text-ink">
              Laporan kas
            </Link>
            <Link href="/donasi" className="hover:text-ink">
              Donasi
            </Link>
            <Link href="/masuk" className="hover:text-ink">
              Masuk pengurus
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
