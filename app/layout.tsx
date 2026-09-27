import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import InteractiveBackground from "@/components/InteractiveBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <InteractiveBackground />
        {children}
      </body>
    </html>
  );
}