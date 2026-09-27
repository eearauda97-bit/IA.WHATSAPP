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
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">{establishmentName}</p>
          <p className="text-xs text-inkMuted">Painel de atendimento</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-surfaceMuted px-2.5 py-1 text-xs font-medium text-inkSecondary">
            {ROLE_LABEL[role] ?? role}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}