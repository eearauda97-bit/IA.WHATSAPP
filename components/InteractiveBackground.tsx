// components/InteractiveBackground.tsx
// Fundo estático e discreto: cinza-azulado com uma luz muito leve no topo.
// Mantive o nome do arquivo para não precisar mudar nenhum import.

export default function InteractiveBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundColor: "#E9EDF4",
        backgroundImage:
          "radial-gradient(900px 420px at 50% -80px, rgba(54,84,224,0.07), transparent 70%)",
      }}
    />
  );
}