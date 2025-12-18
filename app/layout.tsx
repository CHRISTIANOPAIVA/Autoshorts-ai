import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autoshorts AI",
  description: "Generate 60-second video scripts from any article URL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
