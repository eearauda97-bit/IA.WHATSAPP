"use client";

import Image from "next/image";

export default function BarbershopBackground({
  src = "/images/barbearia-fundo.jpg",
  alt = "",
}: {
  src?: string;
  alt?: string;
}) {
  return (
    <div
      aria-hidden={alt === ""}
      className="fixed inset-0 -z-10 overflow-hidden bg-[#1B140F]"
    >
      <div className="bg-kenburns absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="100vw"
          quality={80}
          className="object-cover"
        />
      </div>

      {/* Escurece a foto para o texto ficar legivel (mais alto = mais escuro) */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Vinheta com tom quente nas bordas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 80% at 50% 35%, rgba(43,31,23,0) 0%, rgba(16,11,8,0.75) 100%)",
        }}
      />

      <style jsx global>{`
        @keyframes kenburns {
          from {
            transform: scale(1) translate3d(0, 0, 0);
          }
          to {
            transform: scale(1.08) translate3d(-1%, -1%, 0);
          }
        }
        @media (prefers-reduced-motion: no-preference) {
          .bg-kenburns {
            animation: kenburns 32s ease-in-out infinite alternate;
            will-change: transform;
          }
        }
      `}</style>
    </div>
  );
}
