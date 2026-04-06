import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Bizzn.de – Die Gastronomie-Plattform",
  description:
    "Speisekarte, Bestellungen und Zahlungen in einer Plattform. Das Betriebssystem für die moderne Gastronomie.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${inter.className} bg-[#1A1A1A] text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
