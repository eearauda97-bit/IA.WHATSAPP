// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fila de Atendimento",
  description: "Sistema de fila de atendimento via WhatsApp",
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