import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bedriftstargeting",
  description: "Finn bedrifter og lag bedriftslister for Google Ads og SOME-kanaler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body className="antialiased">{children}</body>
    </html>
  );
}
