"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB, DonasiBaru, Donasi, Masjid, Pengurus, Row, TableName } from "./types";
import { buatDataContoh } from "./seed";
import { finalisasiPenghitungan, periodeTerkunci } from "./logic";
import { uid } from "./format";

/**
 * Penyimpanan data.
 *
 * Versi ini berjalan dalam MODE DEMO: seluruh data disimpan di localStorage
 * browser sehingga aplikasi bisa dipakai (dan di-deploy) tanpa server.
 * Semua akses data lewat fungsi di file ini, jadi saat pindah ke Supabase
 * cukup mengganti isi `simpan`/`muat` dengan panggilan ke tabel di
 * supabase/migrations/0001_skema.sql — halaman tidak perlu diubah.
 */

const KEY_DB = "almisbah:db:v1";
const KEY_SESI = "almisbah:sesi:v1";

function muat(): DB {
  try {
    const raw = localStorage.getItem(KEY_DB);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* abaikan, pakai data contoh */
  }
  return buatDataContoh();
}

function simpan(db: DB) {
  try {
    localStorage.setItem(KEY_DB, JSON.stringify(db));
  } catch {
    alert("Penyimpanan browser penuh. Coba hapus beberapa foto bukti atau setel ulang data demo.");
  }
}

export class GagalError extends Error {}

interface Store {
  siap: boolean;
  db: DB;
  saya: Pengurus | null;
  masuk: (pengurusId: string) => void;
  keluar: () => void;
  insert: <T extends TableName>(table: T, row: Row<T>, log?: string) => Row<T>;
  update: <T extends TableName>(table: T, id: string, patch: Partial<Row<T>>, log?: string) => void;
  updateMasjid: (patch: Partial<Masjid>) => void;
  /** Jalankan beberapa perubahan sekaligus (atomik). */
  transaksi: (fn: (draft: DB) => void, log?: { aksi: string; entitas: string; entitas_id?: string | null }) => void;
  kirimDonasi: (d: DonasiBaru, buktiUrl: string | null) => Donasi;
  setelUlang: () => void;
}

const Ctx = createContext<Store | null>(null);

function tulisLog(draft: DB, pengurusId: string | undefined, aksi: string, entitas: string, entitasId: string | null) {
  if (!pengurusId) return;
  draft.log_aktivitas.unshift({ id: uid(), pengurus_id: pengurusId, aksi, entitas, entitas_id: entitasId, waktu: new Date().toISOString() });
  if (draft.log_aktivitas.length > 500) draft.log_aktivitas.length = 500;
}

/** Aturan yang di Supabase dijaga trigger database. */
function validasi(before: DB, after: DB) {
  const lama = new Map(before.transaksi.map((t) => [t.id, t]));
  if (after.transaksi.length < before.transaksi.length) throw new GagalError("Transaksi tidak boleh dihapus. Gunakan koreksi.");
  for (const t of after.transaksi) {
    const old = lama.get(t.id);
    if (old && JSON.stringify(old) !== JSON.stringify(t)) throw new GagalError("Transaksi tidak bisa diubah. Gunakan transaksi koreksi.");
    if (!old && periodeTerkunci(after, t.tanggal)) throw new GagalError("Periode ini sudah tutup buku dan terkunci.");
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => buatDataContoh());
  const [sesi, setSesi] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    setDb(muat());
    try {
      setSesi(localStorage.getItem(KEY_SESI));
    } catch {
      /* noop */
    }
    setSiap(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_DB && e.newValue) setDb(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saya = useMemo(() => db.pengurus.find((p) => p.id === sesi && p.aktif) ?? null, [db.pengurus, sesi]);

  // Ref agar beberapa perubahan berturut-turut dalam satu klik tidak saling menimpa.
  const dbRef = useRef(db);
  dbRef.current = db;

  const jalankan = useCallback((fn: (draft: DB) => void) => {
    const prev = dbRef.current;
    const draft: DB = structuredClone(prev);
    fn(draft);
    validasi(prev, draft);
    simpan(draft);
    dbRef.current = draft;
    setDb(draft);
    return draft;
  }, []);

  const store: Store = {
    siap,
    db,
    saya,
    masuk: (id) => {
      localStorage.setItem(KEY_SESI, id);
      setSesi(id);
      jalankan((d) => tulisLog(d, id, "Masuk ke aplikasi", "akun", id));
    },
    keluar: () => {
      localStorage.removeItem(KEY_SESI);
      setSesi(null);
    },
    insert: (table, row, log) => {
      jalankan((d) => {
        (d[table] as Row<typeof table>[]).push(row);
        if (log) tulisLog(d, saya?.id, log, table, row.id);
      });
      return row;
    },
    update: (table, id, patch, log) => {
      jalankan((d) => {
        const arr = d[table] as Row<typeof table>[];
        const i = arr.findIndex((x) => x.id === id);
        if (i >= 0) arr[i] = { ...arr[i], ...patch };
        if (log) tulisLog(d, saya?.id, log, table, id);
        // Saksi terakhir menyetujui → transaksi kotak amal otomatis tercatat
        if (table === "saksi") {
          const s = d.saksi.find((x) => x.id === id);
          if (s) {
            const t = finalisasiPenghitungan(d, s.penghitungan_id);
            if (t) {
              d.transaksi.push(t);
              const p = d.penghitungan.find((x) => x.id === s.penghitungan_id)!;
              p.status = "terkonfirmasi";
              p.transaksi_id = t.id;
            }
          }
        }
      });
    },
    updateMasjid: (patch) => {
      jalankan((d) => {
        d.masjid = { ...d.masjid, ...patch };
        tulisLog(d, saya?.id, "Mengubah profil masjid", "masjid", d.masjid.id);
      });
    },
    transaksi: (fn, log) => {
      jalankan((d) => {
        fn(d);
        if (log) tulisLog(d, saya?.id, log.aksi, log.entitas, log.entitas_id ?? null);
      });
    },
    kirimDonasi: (input, buktiUrl) => {
      const d: Donasi = {
        id: uid(),
        kantong_id: input.kantong_id,
        program_id: input.program_id,
        nama_donatur: input.nama_donatur.trim(),
        anonim: input.anonim,
        no_wa: input.no_wa.trim(),
        nominal: input.nominal,
        metode: "qris_statis",
        bukti_url: buktiUrl,
        status: "menunggu",
        alasan_tolak: null,
        doa: input.doa.trim(),
        transaksi_id: null,
        diverifikasi_oleh: null,
        created_at: new Date().toISOString(),
      };
      jalankan((draft) => {
        draft.donasi.push(d);
      });
      return d;
    },
    setelUlang: () => {
      const fresh = buatDataContoh();
      simpan(fresh);
      dbRef.current = fresh;
      setDb(fresh);
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore di luar StoreProvider");
  return s;
}

export function nama(db: DB, pengurusId: string | null | undefined): string {
  return db.pengurus.find((p) => p.id === pengurusId)?.nama ?? "—";
}
