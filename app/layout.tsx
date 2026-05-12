import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audience Segmenter — Folio",
  description: "Live bedriftslister fra Enhetsregisteret for Meta & Google Ads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className="antialiased">{children}</body>
    </html>
  );
}
