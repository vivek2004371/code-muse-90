import { AlertTriangle, Eye, EyeOff, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER_KIND,
  PROVIDER_PRESETS,
  clearApiKey,
  getApiKey,
  getBaseUrl,
  getModel,
  getProviderKind,
  isAnthropicKey,
  listModels,
  normalizeBaseUrl,
  setApiKey,
  setBaseUrl,
  setModel,
  setProviderKind,
  validateCredentials,
  type ProviderKind,
} from "@/lib/aiService";
import { useAppStore } from "@/store/useAppStore";

export function SettingsModal() {
  const open = useAppStore((state) => state.settingsOpen);
  const setOpen = useAppStore((state) => state.setSettingsOpen);
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [kind, setKindState] = useState<ProviderKind>(DEFAULT_PROVIDER_KIND);
  const [reveal, setReveal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [remoteModels, setRemoteModels] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setKey(getApiKey());
    setBaseUrlState(getBaseUrl());
    setModelState(getModel());
    setKindState(getProviderKind());
    setReveal(false);
    setRemoteModels([]);
  }, [open]);

  if (!open) return null;

  const isAnthropic = kind === "anthropic";
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const preset = PROVIDER_PRESETS.find(
    (entry) => entry.kind === kind && entry.baseUrl === normalizeBaseUrl(trimmedBase, kind),
  );
  const suggestions = remoteModels.length
    ? remoteModels
    : (preset?.models ?? PROVIDER_PRESETS[0]!.models).map((entry) => entry.id);
  const anthropicUrlWarning =
    isAnthropic && /\/(v1|chat\/completions)$/.test(trimmedBase)
      ? normalizeBaseUrl(trimmedBase, kind)
      : null;
  const keyKindMismatch = !isAnthropic && isAnthropicKey(key);

  const fetchModels = async () => {
    if (!key.trim()) {
      toast.error("Enter an API key first.");
      return;
    }
    setLoadingModels(true);
    try {
      const models = await listModels(key, baseUrl, undefined, kind);
      setRemoteModels(models);
      toast.success(`Found ${models.length} models.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not list models.");
    } finally {
      setLoadingModels(false);
    }
  };

  const save = async () => {
    const trimmed = key.trim();
    const normalizedUrl = normalizeBaseUrl(baseUrl || DEFAULT_BASE_URL, kind);
    if (!trimmed) {
      clearApiKey();
      setBaseUrl(normalizedUrl);
      setModel(model || DEFAULT_MODEL);
      setProviderKind(kind);
      toast.success("API key removed.");
      setOpen(false);
      return;
    }
    if (!model.trim()) {
      toast.error("Enter a model name.");
      return;
    }
    if (keyKindMismatch) {
      toast.error(
        "That looks like an Anthropic key (sk-ant-…). Switch the provider preset to “Anthropic (Claude)”.",
      );
      return;
    }
    setChecking(true);
    try {
      const valid = await validateCredentials({
        apiKey: trimmed,
        baseUrl: normalizedUrl,
        model,
        kind,
      });
      if (!valid) {
        toast.error(
          isAnthropic ? "API key rejected by Anthropic." : "That key was rejected by the provider.",
        );
        return;
      }
      setApiKey(trimmed);
      setBaseUrl(normalizedUrl);
      setBaseUrlState(normalizedUrl);
      setModel(model);
      setProviderKind(kind);
      toast.success("Connection verified and saved locally.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not validate credentials.");
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">AI provider settings</h2>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Provider preset</label>
        <select
          value={preset ? `${preset.kind}|${preset.baseUrl}` : "custom"}
          className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary/60"
          onChange={(event) => {
            const next = PROVIDER_PRESETS.find(
              (entry) => `${entry.kind}|${entry.baseUrl}` === event.target.value,
            );
            if (!next) {
              setKindState("openai-compatible");
              return;
            }
            setKindState(next.kind);
            setBaseUrlState(next.baseUrl);
            setModelState(next.models[0]?.id ?? "");
            setRemoteModels([]);
          }}
        >
          {PROVIDER_PRESETS.map((entry) => (
            <option key={`${entry.kind}|${entry.baseUrl}`} value={`${entry.kind}|${entry.baseUrl}`}>
              {entry.label}
            </option>
          ))}
          <option value="custom">Custom endpoint</option>
        </select>

        <label className="mb-1.5 mt-4 block text-xs font-medium text-muted-foreground">
          API base URL
        </label>
        <input
          value={baseUrl}
          placeholder={DEFAULT_BASE_URL}
          spellCheck={false}
          className="w-full rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/60"
          onChange={(event) => setBaseUrlState(event.target.value)}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Anthropic's native API (<span className="font-mono">/v1/messages</span>) is supported
          directly, plus any OpenAI-compatible endpoint: OpenRouter, OpenAI, Gemini, DeepSeek, Groq,
          Ollama, LM Studio, vLLM.
        </p>
        {anthropicUrlWarning && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-500">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Anthropic's base URL should not include a path — saving as{" "}
              <span className="font-mono">{anthropicUrlWarning}</span>.
            </span>
          </div>
        )}

        <label className="mb-1.5 mt-4 block text-xs font-medium text-muted-foreground">API key</label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 focus-within:border-primary/60">
          <input
            type={reveal ? "text" : "password"}
            value={key}
            placeholder={preset?.keyHint ?? "sk-…"}
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
          Stored only in this browser's localStorage and sent directly to your provider.
        </p>
        {keyKindMismatch && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-500">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              This looks like an Anthropic key. Select the “Anthropic (Claude)” preset above.
            </span>
          </div>
        )}

        <div className="mb-1.5 mt-4 flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Model</label>
          {!isAnthropic && (
            <button
              type="button"
              disabled={loadingModels}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline disabled:opacity-50"
              onClick={() => void fetchModels()}
            >
              {loadingModels ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Load models
            </button>
          )}
        </div>
        <input
          value={model}
          list="model-suggestions"
          spellCheck={false}
          placeholder={DEFAULT_MODEL}
          className="w-full rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/60"
          onChange={(event) => setModelState(event.target.value)}
        />
        <datalist id="model-suggestions">
          {suggestions.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
        {(isAnthropic || !remoteModels.length) && preset && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {preset.models.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                  model === entry.id
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setModelState(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}

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
