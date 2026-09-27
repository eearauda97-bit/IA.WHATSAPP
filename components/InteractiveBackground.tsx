// components/InteractiveBackground.tsx
// Brilho discreto que acompanha o cursor. Muito sutil de propósito —
// é um detalhe de acabamento, não um elemento decorativo chamativo.

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
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-bg">
      <div
        className="absolute inset-0 transition-[background] duration-300"
        style={{
          background:
            "radial-gradient(700px circle at var(--mx) var(--my), rgba(54,84,224,0.035), transparent 65%)",
        }}
      />
    </div>
  );
}