import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import InteractiveBackground from "@/components/InteractiveBackground";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lista de Espera Inteligente",
  description: "Gerencie a fila de espera do seu estabelecimento",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="min-h-screen font-body text-ink antialiased">
        <InteractiveBackground />
        {children}
      </body>
    </html>
  );
}