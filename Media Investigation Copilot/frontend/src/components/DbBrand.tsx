import { cn } from "@/lib/utils";

export function DeutscheBankMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/deutsche-bank-logo.png"
      alt="Deutsche Bank"
      className={cn("block h-9 w-9 shrink-0 object-contain", className)}
    />
  );
}

export function DbBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <DeutscheBankMark />
      <span className={compact ? "hidden sm:block" : "block"}>
        <span className="block font-display text-sm font-extrabold leading-tight tracking-tight text-foreground">
          dbCrimeCatcher
        </span>
        <span className="block text-[10px] font-semibold uppercase leading-tight tracking-[0.16em] text-muted-foreground">
          Financial Crime Intelligence
        </span>
      </span>
    </span>
  );
}
