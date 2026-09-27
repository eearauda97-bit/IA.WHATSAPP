// components/InteractiveBackground.tsx
// Fundo decorativo: um brilho suave que segue o mouse, mais duas manchas
// desfocadas que derivam lentamente. Fica fixo atrás de todo o conteúdo.

"use client";

import { useEffect } from "react";

export default function InteractiveBackground() {
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--mx", `${x}%`);
      document.documentElement.style.setProperty("--my", `${y}%`);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx) var(--my), rgba(31,111,92,0.08), transparent 70%)",
        }}
      />
      <div className="animate-blob-a absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-accentSoft/70 blur-3xl" />
      <div className="animate-blob-b absolute right-[-10%] bottom-[-15%] h-[480px] w-[480px] rounded-full bg-amberSoft/60 blur-3xl" />
    </div>
  );
}