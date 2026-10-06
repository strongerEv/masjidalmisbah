"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { JABATAN_LABEL } from "@/lib/format";
import { Button, Card, Field, Input, Segmented } from "@/components/ui";
import { Avatar } from "@/components/app-shell";

const OTP_DEMO = "123456";

function Masuk() {
  const { db, masuk } = useStore();
  const router = useRouter();
  const ke = useSearchParams().get("ke") || "/app";
  const [cara, setCara] = useState<"hp" | "email">("hp");
  const [hp, setHp] = useState("");
  const [otpTerkirim, setOtpTerkirim] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const aktif = db.pengurus.filter((p) => p.aktif);
  const lanjut = (id: string) => {
    masuk(id);
    router.replace(ke.startsWith("/app") ? ke : "/app");
  };
  const normal = (s: string) => s.replace(/\D/g, "").replace(/^62/, "0");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Logo Masjid Al Misbah" width={84} height={84} className="rounded-2xl shadow-sm" priority />
          <h1 className="mt-4 text-2xl font-bold">Masuk Pengurus</h1>
          <p className="text-muted">Keuangan & Donasi Masjid Al Misbah</p>
        </Link>

        <Card className="p-5 sm:p-6">
          <Segmented
            value={cara}
            onChange={(v) => {
              setCara(v);
              setErr(null);
            }}
            options={[
              { value: "hp", label: "Nomor HP" },
              { value: "email", label: "Email" },
            ]}
          />
          {cara === "hp" ? (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const p = aktif.find((x) => normal(x.no_hp) === normal(hp));
                if (!p) return setErr("Nomor ini belum terdaftar sebagai pengurus aktif.");
                if (!otpTerkirim) {
                  setErr(null);
                  return setOtpTerkirim(true);
                }
                if (otp !== OTP_DEMO) return setErr("Kode OTP salah.");
                lanjut(p.id);
              }}
            >
              <Field label="Nomor HP">
                <Input inputMode="tel" placeholder="08xx xxxx xxxx" value={hp} onChange={(e) => setHp(e.target.value)} disabled={otpTerkirim} />
              </Field>
              {otpTerkirim && (
                <Field label="Kode OTP" hint={`Mode demo: kode OTP selalu ${OTP_DEMO}`}>
                  <Input inputMode="numeric" maxLength={6} autoFocus placeholder="6 digit" value={otp} onChange={(e) => setOtp(e.target.value)} className="num tracking-[0.4em]" />
                </Field>
              )}
              {err && <p className="text-sm font-medium text-keluar">{err}</p>}
              <Button className="w-full" size="lg">
                {otpTerkirim ? "Masuk" : "Kirim kode OTP"}
              </Button>
            </form>
          ) : (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const p = aktif.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
                if (!p || pw.length < 1) return setErr("Email atau password salah.");
                lanjut(p.id);
              }}
            >
              <Field label="Email">
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Password" hint="Mode demo: password apa saja diterima">
                <Input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </Field>
              {err && <p className="text-sm font-medium text-keluar">{err}</p>}
              <Button className="w-full" size="lg">
                Masuk
              </Button>
            </form>
          )}
        </Card>

        <Card className="mt-4 p-5 sm:p-6">
          <div className="mb-3 flex items-start gap-2 text-sm text-muted">
            <Info size={18} className="mt-0.5 shrink-0 text-gold" />
            <span>Mode demo — coba langsung dengan salah satu akun pengurus. Tiap jabatan punya hak akses berbeda.</span>
          </div>
          <div className="divide-y divide-line">
            {aktif.map((p) => (
              <button key={p.id} onClick={() => lanjut(p.id)} className="flex w-full items-center gap-3 py-3 text-left">
                <Avatar nama={p.nama} />
                <div className="flex-1">
                  <div className="font-semibold">{p.nama}</div>
                  <div className="text-sm text-muted">{JABATAN_LABEL[p.jabatan]}</div>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </button>
            ))}
          </div>
        </Card>

        <p className="mt-6 text-center text-muted">
          Ingin berdonasi?{" "}
          <Link href="/donasi" className="font-semibold text-brand">
            Buka halaman donasi
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Masuk />
    </Suspense>
  );
}
