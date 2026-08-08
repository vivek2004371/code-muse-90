import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AVAILABLE_MODELS,
  clearApiKey,
  getApiKey,
  getModel,
  setApiKey,
  setModel,
  validateApiKey,
} from "@/lib/aiService";
import { useAppStore } from "@/store/useAppStore";

export function SettingsModal() {
  const open = useAppStore((state) => state.settingsOpen);
  const setOpen = useAppStore((state) => state.setSettingsOpen);
  const [key, setKey] = useState("");
  const [model, setModelState] = useState<string>(AVAILABLE_MODELS[0]);
  const [reveal, setReveal] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(getApiKey());
    setModelState(getModel());
    setReveal(false);
  }, [open]);

  if (!open) return null;

  const save = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      clearApiKey();
      toast.success("API key removed.");
      setOpen(false);
      return;
    }
    setChecking(true);
    try {
      const valid = await validateApiKey(trimmed);
      if (!valid) {
        toast.error("That key was rejected by Anthropic.");
        return;
      }
      setApiKey(trimmed);
      setModel(model);
      toast.success("API key verified and saved locally.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not validate key.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={() => !checking && setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Anthropic API key
        </label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 focus-within:border-primary/60">
          <input
            type={reveal ? "text" : "password"}
            value={key}
            placeholder="sk-ant-..."
            autoComplete="off"
            className="flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setKey(event.target.value)}
          />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setReveal((prev) => !prev)}
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Stored only in this browser's localStorage and sent directly to Anthropic.
        </p>

        <label className="mb-1.5 mt-4 block text-xs font-medium text-muted-foreground">
          Model
        </label>
        <select
          value={model}
          className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary/60"
          onChange={(event) => setModelState(event.target.value)}
        >
          {AVAILABLE_MODELS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={checking}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => void save()}
          >
            {checking && <Loader2 className="size-3.5 animate-spin" />}
            {checking ? "Validating…" : "Validate & save"}
          </button>
        </div>
      </div>
    </div>
  );
}
