// components/TopBar.tsx
import SignOutButton from "@/components/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  STAFF: "Equipe",
};

export default function TopBar({
  establishmentName,
  role,
}: {
  establishmentName: string;
  role: string;
}) {
  return (
    <header className="bg-[#0E7490] shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-white">{establishmentName}</p>
          <p className="text-xs font-medium text-[#ECFEFF]">
            Painel de atendimento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0B4A5C]">
            {ROLE_LABEL[role] ?? role}
          </span>
          {/* Força o botão Sair a ficar sólido e legível sobre a barra */}
          <div className="[&_button]:!border-transparent [&_button]:!bg-white [&_button]:!font-medium [&_button]:!text-[#0B4A5C] [&_button:hover]:!bg-[#ECFEFF]">
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}