import type { DB, Donasi, Kategori, Kantong, KotakAmal, Pengajuan, Pengurus, Penghitungan, Saksi, Transaksi, TutupBuku } from "./types";
import { addDays, isoDate, jumatTerakhir, periodeDari, toDate, today } from "./format";

/** PRNG deterministik agar data contoh selalu sama. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let counter = 0;
const id = (p: string) => `${p}-${(++counter).toString().padStart(5, "0")}-0000-4000-8000-000000000000`.slice(0, 36);

export function buatDataContoh(): DB {
  counter = 0;
  const r = rng(1448);
  const between = (a: number, b: number, step = 1000) => Math.round((a + r() * (b - a)) / step) * step;
  const now = today();
  const created = (tgl: string, jam = 13) => new Date(toDate(tgl).getTime() + jam * 3600_000).toISOString();

  const pengurus: Pengurus[] = [
    { id: id("p"), user_id: null, nama: "H. Abdul Rahman", no_hp: "081234500001", email: "ketua@almisbah.id", jabatan: "ketua", aktif: true, created_at: created(addDays(now, -400)) },
    { id: id("p"), user_id: null, nama: "Pak Hasan", no_hp: "081234500002", email: "bendahara@almisbah.id", jabatan: "bendahara", aktif: true, created_at: created(addDays(now, -400)) },
    { id: id("p"), user_id: null, nama: "Ust. Ahmad Fauzi", no_hp: "081234500003", email: "sekretaris@almisbah.id", jabatan: "pengurus", aktif: true, created_at: created(addDays(now, -400)) },
    { id: id("p"), user_id: null, nama: "Pak Dedi Kurnia", no_hp: "081234500004", email: "dedi@almisbah.id", jabatan: "pengurus", aktif: true, created_at: created(addDays(now, -300)) },
  ];
  const [ketua, bendahara, sekretaris, dedi] = pengurus;

  const kantong: Kantong[] = [
    { id: id("k"), nama: "Operasional", jenis: "bebas", deskripsi: "Biaya rutin masjid: listrik, air, kebersihan, honor marbot.", saldo_awal: 8_500_000, aktif: true, urutan: 1 },
    { id: id("k"), nama: "Pembangunan", jenis: "terikat", deskripsi: "Khusus renovasi dan pembangunan fisik masjid.", saldo_awal: 48_000_000, aktif: true, urutan: 2 },
    { id: id("k"), nama: "Anak Yatim", jenis: "terikat", deskripsi: "Santunan bulanan anak yatim dan dhuafa sekitar masjid.", saldo_awal: 9_500_000, aktif: true, urutan: 3 },
    { id: id("k"), nama: "Ramadan", jenis: "terikat", deskripsi: "Takjil, buka bersama, dan kegiatan bulan Ramadan.", saldo_awal: 0, aktif: true, urutan: 4 },
  ];
  const [kOps, kBangun, kYatim, kRamadan] = kantong;

  const kat = (nama: string, arah: "masuk" | "keluar", sistem: string | null = null): Kategori => ({ id: id("c"), nama, arah, sistem, aktif: true });
  const kategori: Kategori[] = [
    kat("Infak Jumat", "masuk", "infak_jumat"),
    kat("Kotak amal", "masuk", "kotak_amal"),
    kat("Donasi QRIS", "masuk", "donasi_qris"),
    kat("Donatur tetap", "masuk"),
    kat("Sewa aula", "masuk"),
    kat("Lain-lain", "masuk"),
    kat("Transfer antar kantong", "masuk", "transfer_masuk"),
    kat("Listrik & air", "keluar"),
    kat("Honor imam/marbot", "keluar"),
    kat("Kebersihan", "keluar"),
    kat("Perbaikan", "keluar"),
    kat("Kegiatan", "keluar"),
    kat("Santunan", "keluar"),
    kat("Lain-lain", "keluar"),
    kat("Transfer antar kantong", "keluar", "transfer_keluar"),
  ];
  const K = (nama: string, arah: "masuk" | "keluar") => kategori.find((k) => k.nama === nama && k.arah === arah)!.id;

  const kotak: KotakAmal[] = [
    { id: id("b"), nama: "Kotak Jumat", lokasi: "Diedarkan saat khutbah", kantong_id: kOps.id, kategori_id: K("Infak Jumat", "masuk"), aktif: true },
    { id: id("b"), nama: "Kotak Teras", lokasi: "Teras depan, dekat tempat wudu", kantong_id: kOps.id, kategori_id: K("Kotak amal", "masuk"), aktif: true },
    { id: id("b"), nama: "Kotak Pembangunan", lokasi: "Pintu utama", kantong_id: kBangun.id, kategori_id: K("Kotak amal", "masuk"), aktif: true },
  ];

  const transaksi: Transaksi[] = [];
  const penghitungan: Penghitungan[] = [];
  const saksi: Saksi[] = [];
  const donasi: Donasi[] = [];
  const pengajuan: Pengajuan[] = [];

  const tx = (t: Partial<Transaksi> & Pick<Transaksi, "kantong_id" | "kategori_id" | "arah" | "tanggal" | "nominal" | "keterangan">): Transaksi => {
    const row: Transaksi = {
      id: id("t"),
      pihak: "",
      bukti_url: null,
      sumber: "manual",
      sumber_id: null,
      koreksi_dari: null,
      alasan_koreksi: null,
      dicatat_oleh: bendahara.id,
      created_at: created(t.tanggal, 14),
      ...t,
    };
    transaksi.push(row);
    return row;
  };

  // Pengeluaran rutin yang sudah disetujui sekali oleh Ketua (PGL-04)
  const start = isoDate(new Date(toDate(now).getFullYear() - 1, toDate(now).getMonth(), 1));
  const rutinListrik: Pengajuan = {
    id: id("a"), jenis: "pengeluaran", pengaju_id: bendahara.id, tujuan: "Tagihan listrik & PDAM bulanan", nominal: 1_800_000,
    kantong_id: kOps.id, kantong_tujuan_id: null, kategori_id: K("Listrik & air", "keluar"), lampiran_url: null, rutin: true,
    status: "disetujui", alasan: null, disetujui_oleh: ketua.id, waktu_keputusan: created(start, 9), created_at: created(start, 8),
  };
  const rutinMarbot: Pengajuan = {
    ...rutinListrik, id: id("a"), tujuan: "Honor marbot & imam rawatib", nominal: 2_500_000, kategori_id: K("Honor imam/marbot", "keluar"),
  };
  pengajuan.push(rutinListrik, rutinMarbot);

  // Kotak amal setiap Jumat selama ~12 bulan
  const jumatIni = jumatTerakhir(now);
  let jumat = jumatTerakhir(start);
  const saksiPilihan = [sekretaris, dedi, ketua];
  while (jumat <= jumatIni) {
    const terbaru = jumat === jumatIni;
    for (const b of kotak) {
      const total =
        b.nama === "Kotak Jumat" ? between(1_100_000, 2_300_000) : b.nama === "Kotak Teras" ? between(150_000, 450_000) : between(300_000, 900_000);
      const pecahan: Record<string, number> = {};
      let sisa = total;
      for (const d of [100000, 50000, 20000, 10000, 5000, 2000]) {
        const n = Math.floor((sisa * (0.25 + r() * 0.2)) / d);
        if (n > 0) pecahan[d] = n;
        sisa -= n * d;
      }
      pecahan["1000"] = Math.floor(sisa / 1000);
      const menunggu = terbaru && b.nama === "Kotak Pembangunan";
      const p: Penghitungan = {
        id: id("h"), kotak_id: b.id, tanggal: jumat, rincian_pecahan: pecahan, total, status: menunggu ? "menunggu" : "terkonfirmasi",
        dicatat_oleh: bendahara.id, transaksi_id: null, created_at: created(jumat, 13.5),
      };
      const sk = menunggu ? ketua : saksiPilihan[Math.floor(r() * 2)];
      saksi.push({ id: id("s"), penghitungan_id: p.id, pengurus_id: sk.id, status: menunggu ? "menunggu" : "setuju", catatan: "", waktu: menunggu ? null : created(jumat, 14) });
      if (!menunggu) {
        const t = tx({ kantong_id: b.kantong_id, kategori_id: b.kategori_id, arah: "masuk", tanggal: jumat, nominal: total, keterangan: `Penghitungan ${b.nama}`, pihak: "Jamaah", sumber: "kotak", sumber_id: p.id });
        p.transaksi_id = t.id;
      }
      penghitungan.push(p);
    }
    jumat = addDays(jumat, 7);
  }

  // Transaksi bulanan
  const program = [
    { id: id("g"), nama: "Renovasi atap masjid", deskripsi: "Mengganti rangka dan genteng atap ruang utama yang bocor saat hujan.", foto_url: null, target: 85_000_000, tenggat: addDays(now, 120), kantong_id: kBangun.id, aktif: true },
    { id: id("g"), nama: "Santunan yatim Muharram", deskripsi: "Santunan dan perlengkapan sekolah untuk 40 anak yatim sekitar masjid.", foto_url: null, target: 20_000_000, tenggat: addDays(now, 60), kantong_id: kYatim.id, aktif: true },
  ];
  const namaDonatur = ["Keluarga Bpk. Sutrisno", "Ibu Ratna", "Andi Pratama", "Hj. Maryam", "Rizky F.", "Bu Endang", "Dimas", "Nur Aini", "Yusuf", "Fajar & Lina"];

  for (let i = 12; i >= 0; i--) {
    const base = toDate(now);
    const d0 = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const ym = isoDate(d0).slice(0, 7);
    const day = (n: number) => `${ym}-${String(n).padStart(2, "0")}`;
    const ok = (tgl: string) => tgl <= now && tgl >= start;

    if (ok(day(5))) tx({ kantong_id: kOps.id, kategori_id: K("Listrik & air", "keluar"), arah: "keluar", tanggal: day(5), nominal: between(1_150_000, 1_750_000), keterangan: "Token listrik & tagihan PDAM", pihak: "PLN / PDAM", sumber: "pengajuan", sumber_id: rutinListrik.id });
    if (ok(day(1))) tx({ kantong_id: kOps.id, kategori_id: K("Honor imam/marbot", "keluar"), arah: "keluar", tanggal: day(1), nominal: 2_500_000, keterangan: "Honor marbot & imam rawatib", pihak: "Pak Udin (marbot)", sumber: "pengajuan", sumber_id: rutinMarbot.id });
    if (ok(day(12))) tx({ kantong_id: kOps.id, kategori_id: K("Kebersihan", "keluar"), arah: "keluar", tanggal: day(12), nominal: between(200_000, 450_000), keterangan: "Sabun, pewangi karpet, alat kebersihan", pihak: "Toko Berkah" });
    if (ok(day(15))) tx({ kantong_id: kYatim.id, kategori_id: K("Santunan", "keluar"), arah: "keluar", tanggal: day(15), nominal: 1_000_000, keterangan: "Santunan bulanan 10 anak yatim", pihak: "Anak yatim binaan" });
    if (ok(day(20)) && r() > 0.5) tx({ kantong_id: kOps.id, kategori_id: K("Sewa aula", "masuk"), arah: "masuk", tanggal: day(20), nominal: between(500_000, 1_000_000, 50_000), keterangan: "Sewa aula untuk walimah", pihak: "Warga RT 03" });
    if (ok(day(22)) && r() > 0.6) tx({ kantong_id: kOps.id, kategori_id: K("Kegiatan", "keluar"), arah: "keluar", tanggal: day(22), nominal: between(300_000, 900_000), keterangan: "Konsumsi kajian bulanan", pihak: "Catering Bu Yati" });

    // Donasi QRIS
    const jumlah = 4 + Math.floor(r() * 5);
    for (let j = 0; j < jumlah; j++) {
      const tgl = day(1 + Math.floor(r() * 27));
      if (!ok(tgl)) continue;
      const pilih = r();
      const prog = pilih < 0.35 ? program[0] : pilih < 0.5 ? program[1] : null;
      const kt = prog ? prog.kantong_id : pilih < 0.7 ? kBangun.id : pilih < 0.9 ? kYatim.id : kOps.id;
      const nominal = [50_000, 100_000, 100_000, 150_000, 200_000, 250_000, 500_000, 1_000_000][Math.floor(r() * 8)];
      const menunggu = addDays(now, -2) < tgl;
      const nm = namaDonatur[Math.floor(r() * namaDonatur.length)];
      const dn: Donasi = {
        id: id("d"), kantong_id: kt, program_id: prog?.id ?? null, nama_donatur: nm, anonim: r() > 0.5, no_wa: "08123" + String(Math.floor(r() * 1e7)).padStart(7, "0"),
        nominal, metode: "qris_statis", bukti_url: null, status: menunggu ? "menunggu" : "terverifikasi", alasan_tolak: null, doa: "",
        transaksi_id: null, diverifikasi_oleh: menunggu ? null : bendahara.id, created_at: created(tgl, 9 + Math.floor(r() * 10)),
      };
      if (!menunggu) {
        const t = tx({ kantong_id: kt, kategori_id: K("Donasi QRIS", "masuk"), arah: "masuk", tanggal: tgl, nominal, keterangan: prog ? `Donasi program ${prog.nama}` : "Donasi QRIS", pihak: dn.anonim ? "Hamba Allah" : nm, sumber: "donasi", sumber_id: dn.id });
        dn.transaksi_id = t.id;
      }
      donasi.push(dn);
    }
  }

  // Pastikan selalu ada donasi menunggu verifikasi untuk dicoba
  for (const [nama, nominal, h] of [["Ibu Ratna", 300_000, 0], ["", 100_000, 1]] as const) {
    donasi.push({
      id: id("d"), kantong_id: kBangun.id, program_id: program[0].id, nama_donatur: nama, anonim: nama === "", no_wa: nama ? "081298765432" : "",
      nominal, metode: "qris_statis", bukti_url: null, status: "menunggu", alasan_tolak: null, doa: "Semoga berkah untuk keluarga kami",
      transaksi_id: null, diverifikasi_oleh: null, created_at: created(addDays(now, -h), 8 + h),
    });
  }

  // Ramadan 1447 H (Feb–Mar 2026)
  for (const [tgl, nominal, ket, arah] of [
    ["2026-02-13", 8_500_000, "Donasi takjil dari jamaah", "masuk"],
    ["2026-02-27", 4_250_000, "Infak buka bersama", "masuk"],
    ["2026-02-20", 3_600_000, "Takjil pekan 1–2", "keluar"],
    ["2026-03-06", 3_900_000, "Takjil pekan 3–4 & buka bersama", "keluar"],
    ["2026-03-15", 2_500_000, "Honor imam tarawih", "keluar"],
  ] as const) {
    if (tgl < start || tgl > now) continue;
    tx({ kantong_id: kRamadan.id, kategori_id: arah === "masuk" ? K("Lain-lain", "masuk") : K("Kegiatan", "keluar"), arah, tanggal: tgl, nominal, keterangan: ket, pihak: arah === "masuk" ? "Jamaah" : "Panitia Ramadan" });
  }

  // Pengeluaran besar pembangunan dengan persetujuan Ketua
  const besar: [number, string, number][] = [[-160, "Pembelian semen & pasir tahap 1", 12_750_000], [-75, "Upah tukang perbaikan dinding mihrab", 6_400_000], [-21, "Pembelian rangka baja ringan atap", 18_900_000]];
  for (const [h, tujuan, nominal] of besar) {
    const tgl = addDays(now, h);
    const a: Pengajuan = {
      id: id("a"), jenis: "pengeluaran", pengaju_id: bendahara.id, tujuan, nominal, kantong_id: kBangun.id, kantong_tujuan_id: null,
      kategori_id: K("Perbaikan", "keluar"), lampiran_url: null, rutin: false, status: "selesai", alasan: null, disetujui_oleh: ketua.id,
      waktu_keputusan: created(addDays(tgl, -2), 20), created_at: created(addDays(tgl, -3), 10),
    };
    pengajuan.push(a);
    tx({ kantong_id: kBangun.id, kategori_id: a.kategori_id!, arah: "keluar", tanggal: tgl, nominal, keterangan: tujuan, pihak: "TB Sumber Rejeki", sumber: "pengajuan", sumber_id: a.id });
  }

  // Pengajuan yang menunggu keputusan Ketua dan siap dibayar
  pengajuan.push({
    id: id("a"), jenis: "pengeluaran", pengaju_id: dedi.id, tujuan: "Ganti pompa air tempat wudu yang rusak", nominal: 2_750_000, kantong_id: kOps.id,
    kantong_tujuan_id: null, kategori_id: K("Perbaikan", "keluar"), lampiran_url: null, rutin: false, status: "menunggu", alasan: null,
    disetujui_oleh: null, waktu_keputusan: null, created_at: created(addDays(now, -1), 16),
  });
  pengajuan.push({
    id: id("a"), jenis: "pengeluaran", pengaju_id: sekretaris.id, tujuan: "Sound system tambahan untuk teras", nominal: 3_200_000, kantong_id: kOps.id,
    kantong_tujuan_id: null, kategori_id: K("Perbaikan", "keluar"), lampiran_url: null, rutin: false, status: "disetujui", alasan: null,
    disetujui_oleh: ketua.id, waktu_keputusan: created(addDays(now, -3), 19), created_at: created(addDays(now, -5), 10),
  });

  // Tutup buku: semua bulan sebelum bulan lalu sudah dikunci
  const tutup_buku: TutupBuku[] = [];
  const bulanLalu = periodeDari(isoDate(new Date(toDate(now).getFullYear(), toDate(now).getMonth() - 1, 1)));
  const periodeSet = new Set(transaksi.map((t) => periodeDari(t.tanggal)));
  for (const p of [...periodeSet].sort()) {
    if (p >= bulanLalu) continue;
    tutup_buku.push({ id: id("z"), periode: p, saldo_catatan: 0, saldo_riil: 0, catatan: "Cocok dengan rekening & kas tunai", ditutup_oleh: bendahara.id, created_at: created(`${p}-28`, 20) });
  }

  transaksi.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.created_at.localeCompare(b.created_at));

  return {
    masjid: {
      id: "masjid-al-misbah",
      nama: "Masjid Al Misbah",
      alamat: "Alamat masjid (ubah di Pengaturan)",
      rekening: "Bank Syariah Indonesia 7xxx-xxx-xxx a.n. DKM Masjid Al Misbah",
      qris_statis: null,
      batas_persetujuan: 1_000_000,
      tampilkan_saldo_publik: true,
    },
    pengurus,
    kantong,
    kategori,
    transaksi,
    kotak,
    penghitungan,
    saksi,
    donasi,
    program,
    pengajuan,
    tutup_buku,
    log_aktivitas: [],
  };
}
