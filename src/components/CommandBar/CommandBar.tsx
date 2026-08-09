import { Loader2, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AiError, getApiKey, streamInlineEdit } from "@/lib/aiService";
import { db, logTask, saveFileContent } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";

export function CommandBar() {
  const open = useAppStore((state) => state.commandBarOpen);
  const setOpen = useAppStore((state) => state.setCommandBarOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const activeFileId = useAppStore((state) => state.activeFileId);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPreview("");
      setInstruction("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const run = async () => {
    const prompt = instruction.trim();
    if (!prompt || busy) return;
    if (!getApiKey()) {
      toast.error("Add your API key first.");
      setOpen(false);
      setSettingsOpen(true);
      return;
    }
    if (!activeFileId) {
      toast.error("Open a file first.");
      return;
    }

    const file = await db.files.get(activeFileId);
    if (!file) return;

    setBusy(true);
    setPreview("");
    try {
      const result = await streamInlineEdit({
        instruction: prompt,
        code: file.content,
        fileName: file.name,
        onDelta: (chunk) => setPreview((prev) => prev + chunk),
      });
      await saveFileContent(activeFileId, result);
      await logTask({ prompt, targetFile: file.name, source: "command-bar", status: "success" });
      toast.success(`Updated ${file.name}`);
      setOpen(false);
    } catch (error) {
      const detail = error instanceof AiError ? error.message : "Request failed.";
      toast.error(detail);
      await logTask({
        prompt,
        targetFile: file.name,
        source: "command-bar",
        status: "error",
        detail,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => !busy && setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <Wand2 className="size-4 shrink-0 text-primary" />
          <input
            ref={inputRef}
            value={instruction}
            disabled={busy}
            placeholder="Refactor this function to be async…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void run();
              if (event.key === "Escape" && !busy) setOpen(false);
            }}
          />
          {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        {preview && (
          <pre className="max-h-64 overflow-auto border-t border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <code>{preview}</code>
          </pre>
        )}
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          Enter to run · Esc to close · edits the active file in place
        </div>
      </div>
    </div>
  );
}
