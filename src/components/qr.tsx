"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QR({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: "#1b1f1d", light: "#ffffff" } }).then(setSrc).catch(() => setSrc(""));
  }, [value, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={size} height={size} alt={`QR code ${value}`} /> : <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-black/5" />;
}
