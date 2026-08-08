import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlert, CircleCheck, History as HistoryIcon } from "lucide-react";

import { db, type TaskHistoryEntry } from "@/lib/db";

export function HistoryPanel() {
  const entries =
    useLiveQuery<TaskHistoryEntry[], TaskHistoryEntry[]>(
      async () => (await db.taskHistory.orderBy("createdAt").reverse().toArray()).slice(0, 100),
      [],
      [],
    ) ?? [];

  if (entries.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-2 px-6 text-center">
        <HistoryIcon className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No AI actions recorded yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-y-auto">
      {entries.map((entry) => (
        <li key={entry.id} className="space-y-1.5 px-3 py-3">
          <div className="flex items-center gap-2">
            {entry.status === "success" ? (
              <CircleCheck className="size-3.5 shrink-0 text-primary" />
            ) : (
              <CircleAlert className="size-3.5 shrink-0 text-destructive" />
            )}
            <span className="truncate font-mono text-xs text-foreground">{entry.targetFile}</span>
            <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
              {entry.source}
            </span>
          </div>
          <p className="line-clamp-3 text-xs text-muted-foreground">{entry.prompt}</p>
          <p className="text-[10px] text-muted-foreground/70">
            {new Date(entry.createdAt).toLocaleString()}
            {entry.detail ? ` · ${entry.detail}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
