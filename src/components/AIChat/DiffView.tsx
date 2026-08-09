import { collapseContext, diffLines } from "@/lib/diff";

export function DiffView({ before, after }: { before: string; after: string }) {
  const lines = collapseContext(diffLines(before, after));
  const added = lines.filter((line) => line.kind === "add").length;
  const removed = lines.filter((line) => line.kind === "remove").length;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-2.5 py-1.5 text-[11px] font-mono">
        <span className="text-emerald-400">+{added}</span>
        <span className="text-red-400">−{removed}</span>
        <span className="text-muted-foreground">proposed changes</span>
      </div>
      <div className="max-h-72 overflow-auto font-mono text-[11px] leading-relaxed">
        {lines.map((line, index) => (
          <div
            key={index}
            className={
              line.kind === "add"
                ? "bg-emerald-500/10 px-2.5 text-emerald-300"
                : line.kind === "remove"
                  ? "bg-red-500/10 px-2.5 text-red-300"
                  : "px-2.5 text-muted-foreground"
            }
          >
            <span className="select-none opacity-60">
              {line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " "}{" "}
            </span>
            <span className="whitespace-pre-wrap">{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
