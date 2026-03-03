import logoUrl from "@assets/FundingForge_Logo_1772196329334.png";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoUrl}
        alt="FundingForge"
        className="h-7 w-7 rounded-lg"
      />
      {!compact && (
        <div className="font-sans text-lg font-semibold tracking-tight text-foreground">
          FundingForge
        </div>
      )}
    </div>
  );
}
