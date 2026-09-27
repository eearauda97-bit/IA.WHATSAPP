import "./globals.css";
import type { Metadata } from "next";
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
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}