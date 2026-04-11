import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Bizzn.de – Die Gastronomie-Plattform",
  description:
    "Speisekarte, Bestellungen und Zahlungen in einer Plattform. Das Betriebssystem für die moderne Gastronomie.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${inter.className} bg-[#16161E] text-[#F0F0F8] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
