import Editor from "@monaco-editor/react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { useCallback, useRef } from "react";

import { db, saveFileContent, type FileNode } from "@/lib/db";
import { languageForFile } from "@/lib/language";
import { useAppStore } from "@/store/useAppStore";

export function EditorPane() {
  const openTabs = useAppStore((state) => state.openTabs);
  const activeFileId = useAppStore((state) => state.activeFileId);
  const setActiveFile = useAppStore((state) => state.setActiveFile);
  const closeTab = useAppStore((state) => state.closeTab);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs =
    useLiveQuery<FileNode[], FileNode[]>(
      async () => {
        if (openTabs.length === 0) return [];
        const found = await db.files.bulkGet(openTabs);
        return found.filter((file): file is FileNode => Boolean(file));
      },
      [openTabs.join(",")],
      [],
    ) ?? [];

  const activeFile = tabs.find((file) => file.id === activeFileId) ?? null;

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeFileId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveFileContent(activeFileId, value ?? "");
      }, 150);
    },
    [activeFileId],
  );

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-border bg-card">
        {tabs.map((file) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`group flex h-full shrink-0 items-center gap-2 border-r border-border px-3 text-xs transition-colors ${
                isActive
                  ? "bg-background text-foreground shadow-[inset_0_2px_0_0_var(--color-primary)]"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <button
                type="button"
                className="font-mono"
                onClick={() => setActiveFile(file.id)}
              >
                {file.name}
              </button>
              <button
                type="button"
                aria-label={`Close ${file.name}`}
                className="rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100"
                onClick={() => closeTab(file.id)}
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {activeFile ? (
          <Editor
            key={activeFile.id}
            height="100%"
            theme="vs-dark"
            language={languageForFile(activeFile.name)}
            defaultValue={activeFile.content}
            onChange={handleChange}
            options={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Cascadia Code', monospace",
              fontSize: 13,
              minimap: { enabled: true },
              lineNumbers: "on",
              smoothScrolling: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
              padding: { top: 12 },
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-mono text-sm text-muted-foreground">No file open</p>
            <p className="text-xs text-muted-foreground/70">
              Pick a file from the explorer, or press{" "}
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl/Cmd + K
              </kbd>{" "}
              for AI edits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
