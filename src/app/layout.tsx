import type { Metadata, Viewport } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui";
import { SwRegister } from "@/components/sw-register";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", weight: ["600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Masjid Al Misbah — Keuangan & Donasi", template: "%s · Masjid Al Misbah" },
  description: "Catat keuangan masjid secara amanah, terima donasi via QRIS, dan bagikan laporan kas kepada jamaah.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Al Misbah", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${lora.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
        <SwRegister />
      </body>
    </html>
  );
}
