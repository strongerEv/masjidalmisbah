-- Skema Supabase untuk Aplikasi Keuangan & Donasi Masjid Al Misbah.
-- Disiapkan untuk tahap berikutnya; aplikasi saat ini berjalan dalam mode demo
-- (data di browser). Struktur tabel sama persis dengan src/lib/types.ts.

create extension if not exists pgcrypto;

-- ---------- Tabel ----------
create table masjid (
  id text primary key default 'masjid-al-misbah',
  nama text not null,
  alamat text not null default '',
  rekening text not null default '',
  qris_statis text,
  batas_persetujuan bigint not null default 1000000,
  tampilkan_saldo_publik boolean not null default true
);

create table pengurus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null,
  nama text not null,
  no_hp text not null default '',
  email text not null default '',
  jabatan text not null check (jabatan in ('ketua', 'bendahara', 'pengurus')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table kantong (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jenis text not null check (jenis in ('terikat', 'bebas')),
  deskripsi text not null default '',
  saldo_awal bigint not null default 0,
  aktif boolean not null default true,
  urutan int not null default 0
);

create table kategori (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  arah text not null check (arah in ('masuk', 'keluar')),
  sistem text,
  aktif boolean not null default true
);

create table transaksi (
  id uuid primary key default gen_random_uuid(),
  kantong_id uuid not null references kantong,
  kategori_id uuid not null references kategori,
  arah text not null check (arah in ('masuk', 'keluar')),
  tanggal date not null,
  nominal bigint not null check (nominal <> 0),
  keterangan text not null default '',
  pihak text not null default '',
  bukti_url text,
  sumber text not null check (sumber in ('manual', 'donasi', 'kotak', 'pengajuan', 'transfer', 'koreksi')),
  sumber_id uuid,
  koreksi_dari uuid references transaksi,
  alasan_koreksi text,
  dicatat_oleh uuid not null references pengurus,
  created_at timestamptz not null default now(),
  -- nominal negatif hanya untuk transaksi pembalik koreksi
  check (nominal > 0 or koreksi_dari is not null),
  -- kas keluar manual wajib foto nota
  check (arah = 'masuk' or sumber in ('transfer', 'koreksi') or bukti_url is not null or koreksi_dari is not null)
);
create index on transaksi (kantong_id, tanggal);

create table kotak (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  lokasi text not null default '',
  kantong_id uuid not null references kantong,
  kategori_id uuid not null references kategori,
  aktif boolean not null default true
);

create table penghitungan (
  id uuid primary key default gen_random_uuid(),
  kotak_id uuid not null references kotak,
  tanggal date not null,
  rincian_pecahan jsonb,
  total bigint not null check (total > 0),
  status text not null default 'menunggu' check (status in ('menunggu', 'terkonfirmasi', 'dipersoalkan', 'dibatalkan')),
  dicatat_oleh uuid not null references pengurus,
  transaksi_id uuid references transaksi,
  created_at timestamptz not null default now()
);

create table saksi (
  id uuid primary key default gen_random_uuid(),
  penghitungan_id uuid not null references penghitungan,
  pengurus_id uuid not null references pengurus,
  status text not null default 'menunggu' check (status in ('menunggu', 'setuju', 'tidak_sesuai')),
  catatan text not null default '',
  waktu timestamptz
);

create table program (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  deskripsi text not null default '',
  foto_url text,
  target bigint not null,
  tenggat date,
  kantong_id uuid not null references kantong,
  aktif boolean not null default true
);

create table donasi (
  id uuid primary key default gen_random_uuid(),
  kantong_id uuid not null references kantong,
  program_id uuid references program,
  nama_donatur text not null default '',
  anonim boolean not null default true,
  no_wa text not null default '',
  nominal bigint not null check (nominal >= 10000),
  metode text not null default 'qris_statis' check (metode in ('qris_statis', 'gateway', 'tunai')),
  bukti_url text,
  status text not null default 'menunggu' check (status in ('menunggu', 'terverifikasi', 'ditolak')),
  alasan_tolak text,
  doa text not null default '',
  transaksi_id uuid references transaksi,
  diverifikasi_oleh uuid references pengurus,
  created_at timestamptz not null default now()
);

create table pengajuan (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('pengeluaran', 'transfer')),
  pengaju_id uuid not null references pengurus,
  tujuan text not null,
  nominal bigint not null check (nominal > 0),
  kantong_id uuid not null references kantong,
  kantong_tujuan_id uuid references kantong,
  kategori_id uuid references kategori,
  lampiran_url text,
  rutin boolean not null default false,
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak', 'selesai')),
  alasan text,
  disetujui_oleh uuid references pengurus,
  waktu_keputusan timestamptz,
  created_at timestamptz not null default now()
);

create table tutup_buku (
  id uuid primary key default gen_random_uuid(),
  periode text not null unique check (periode ~ '^\d{4}-\d{2}$'),
  saldo_catatan bigint not null,
  saldo_riil bigint not null,
  catatan text not null default '',
  ditutup_oleh uuid not null references pengurus,
  created_at timestamptz not null default now()
);

create table log_aktivitas (
  id uuid primary key default gen_random_uuid(),
  pengurus_id uuid not null references pengurus,
  aksi text not null,
  entitas text not null,
  entitas_id text,
  waktu timestamptz not null default now()
);

-- ---------- Helper peran ----------
create or replace function saya() returns pengurus language sql stable security definer set search_path = public as $$
  select * from pengurus where user_id = auth.uid() and aktif limit 1
$$;
create or replace function jabatan_saya() returns text language sql stable security definer set search_path = public as $$
  select jabatan from pengurus where user_id = auth.uid() and aktif limit 1
$$;

-- Hubungkan akun login dengan undangan pengurus (berdasarkan email / no HP)
create or replace function tautkan_pengurus() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update pengurus set user_id = new.id
  where user_id is null and ((new.email is not null and lower(email) = lower(new.email)) or (new.phone is not null and regexp_replace(no_hp, '^0', '62') = new.phone));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function tautkan_pengurus();

-- ---------- Aturan amanah (dijaga di database) ----------
-- Transaksi tidak bisa diubah/dihapus; koreksi lewat transaksi baru.
create or replace function tolak_ubah() returns trigger language plpgsql as $$
begin
  raise exception 'Transaksi tidak boleh diubah atau dihapus. Gunakan transaksi koreksi.';
end $$;
create trigger transaksi_immutable before update or delete on transaksi for each row execute function tolak_ubah();

-- Periode yang sudah tutup buku terkunci.
create or replace function cek_periode() returns trigger language plpgsql as $$
begin
  if exists (select 1 from tutup_buku where periode = to_char(new.tanggal, 'YYYY-MM')) then
    raise exception 'Periode % sudah tutup buku.', to_char(new.tanggal, 'YYYY-MM');
  end if;
  return new;
end $$;
create trigger transaksi_periode before insert on transaksi for each row execute function cek_periode();

-- Pengeluaran manual di atas batas wajib lewat pengajuan yang disetujui.
create or replace function cek_batas() returns trigger language plpgsql as $$
declare batas bigint;
begin
  select batas_persetujuan into batas from masjid limit 1;
  if new.arah = 'keluar' and new.sumber = 'manual' and new.koreksi_dari is null and new.nominal > batas then
    raise exception 'Pengeluaran di atas batas wajib disetujui Ketua DKM.';
  end if;
  return new;
end $$;
create trigger transaksi_batas before insert on transaksi for each row execute function cek_batas();

-- Saksi terakhir menyetujui → transaksi kotak amal tercatat otomatis.
create or replace function finalisasi_penghitungan() returns trigger language plpgsql security definer set search_path = public as $$
declare p penghitungan; k kotak; tid uuid;
begin
  select * into p from penghitungan where id = new.penghitungan_id for update;
  if new.status = 'tidak_sesuai' then
    update penghitungan set status = 'dipersoalkan' where id = p.id;
  elsif p.status = 'menunggu' and p.transaksi_id is null
    and not exists (select 1 from saksi where penghitungan_id = p.id and status <> 'setuju') then
    select * into k from kotak where id = p.kotak_id;
    insert into transaksi (kantong_id, kategori_id, arah, tanggal, nominal, keterangan, pihak, sumber, sumber_id, dicatat_oleh)
    values (k.kantong_id, k.kategori_id, 'masuk', p.tanggal, p.total, 'Penghitungan ' || k.nama, 'Jamaah', 'kotak', p.id, p.dicatat_oleh)
    returning id into tid;
    update penghitungan set status = 'terkonfirmasi', transaksi_id = tid where id = p.id;
  end if;
  return new;
end $$;
create trigger saksi_konfirmasi after update of status on saksi for each row execute function finalisasi_penghitungan();

-- ---------- Row Level Security ----------
alter table masjid enable row level security;
alter table pengurus enable row level security;
alter table kantong enable row level security;
alter table kategori enable row level security;
alter table transaksi enable row level security;
alter table kotak enable row level security;
alter table penghitungan enable row level security;
alter table saksi enable row level security;
alter table program enable row level security;
alter table donasi enable row level security;
alter table pengajuan enable row level security;
alter table tutup_buku enable row level security;
alter table log_aktivitas enable row level security;

-- Data referensi: dibaca semua pengurus aktif; dikelola ketua/bendahara
create policy baca on masjid for select using (true);
create policy kelola on masjid for update using (jabatan_saya() in ('ketua', 'bendahara'));
create policy baca on kantong for select using (true);
create policy kelola on kantong for all using (jabatan_saya() in ('ketua', 'bendahara')) with check (jabatan_saya() in ('ketua', 'bendahara'));
create policy baca on kategori for select using (jabatan_saya() is not null);
create policy kelola on kategori for all using (jabatan_saya() in ('ketua', 'bendahara')) with check (jabatan_saya() in ('ketua', 'bendahara'));
create policy baca on kotak for select using (jabatan_saya() is not null);
create policy kelola on kotak for all using (jabatan_saya() in ('ketua', 'bendahara')) with check (jabatan_saya() in ('ketua', 'bendahara'));
create policy baca on program for select using (true);
create policy kelola on program for all using (jabatan_saya() in ('ketua', 'bendahara')) with check (jabatan_saya() in ('ketua', 'bendahara'));

create policy baca on pengurus for select using (jabatan_saya() is not null);
create policy kelola on pengurus for all using (jabatan_saya() = 'ketua') with check (jabatan_saya() = 'ketua');

create policy baca on transaksi for select using (jabatan_saya() is not null);
create policy catat on transaksi for insert with check (jabatan_saya() in ('bendahara', 'ketua') and dicatat_oleh = (saya()).id);

create policy baca on penghitungan for select using (jabatan_saya() is not null);
create policy catat on penghitungan for insert with check (jabatan_saya() = 'bendahara');
create policy batal on penghitungan for update using (jabatan_saya() = 'bendahara');
create policy baca on saksi for select using (jabatan_saya() is not null);
create policy catat on saksi for insert with check (jabatan_saya() = 'bendahara');
create policy konfirmasi on saksi for update using (pengurus_id = (saya()).id);

-- Data donatur hanya untuk bendahara & ketua (UU PDP); jamaah mengirim lewat fungsi kirim_donasi
create policy baca on donasi for select using (jabatan_saya() in ('bendahara', 'ketua'));
create policy verifikasi on donasi for update using (jabatan_saya() in ('bendahara', 'ketua'));

create policy baca on pengajuan for select using (jabatan_saya() is not null);
create policy ajukan on pengajuan for insert with check (pengaju_id = (saya()).id);
create policy putuskan on pengajuan for update using (jabatan_saya() in ('ketua', 'bendahara'));

create policy baca on tutup_buku for select using (jabatan_saya() is not null);
create policy tutup on tutup_buku for insert with check (jabatan_saya() = 'bendahara');

create policy baca on log_aktivitas for select using (jabatan_saya() is not null);
create policy tulis on log_aktivitas for insert with check (pengurus_id = (saya()).id);

-- ---------- Fungsi publik (jamaah tanpa akun) ----------
create or replace function kirim_donasi(p_kantong uuid, p_program uuid, p_nama text, p_anonim boolean, p_wa text, p_nominal bigint, p_doa text, p_bukti text)
returns uuid language sql security definer set search_path = public as $$
  insert into donasi (kantong_id, program_id, nama_donatur, anonim, no_wa, nominal, doa, bukti_url)
  values (p_kantong, p_program, left(p_nama, 80), p_anonim, left(p_wa, 20), p_nominal, left(p_doa, 300), p_bukti)
  returning id
$$;

create or replace function kwitansi(p_id uuid) returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', d.id, 'nama_donatur', coalesce(nullif(d.nama_donatur, ''), 'Hamba Allah'), 'nominal', d.nominal,
    'tujuan', coalesce(p.nama, k.nama), 'status', d.status, 'alasan_tolak', d.alasan_tolak, 'tanggal', d.created_at,
    'masjid', m.nama, 'alamat', m.alamat)
  from donasi d join kantong k on k.id = d.kantong_id left join program p on p.id = d.program_id cross join masjid m
  where d.id = p_id
$$;

grant execute on function kirim_donasi, kwitansi to anon, authenticated;

-- Storage untuk foto nota & bukti donasi
insert into storage.buckets (id, name, public) values ('bukti', 'bukti', false) on conflict do nothing;
create policy "unggah bukti" on storage.objects for insert with check (bucket_id = 'bukti');
create policy "baca bukti pengurus" on storage.objects for select using (bucket_id = 'bukti' and jabatan_saya() is not null);
