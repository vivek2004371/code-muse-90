/**
 * Universal AI adapter.
 *
 * Speaks two wire formats:
 *  - `openai-compatible`: POST {baseUrl}/chat/completions (OpenRouter, OpenAI,
 *    Gemini's OpenAI shim, DeepSeek, Groq, Ollama, LM Studio, vLLM…)
 *  - `anthropic`: POST {baseUrl}/v1/messages with x-api-key auth and
 *    Anthropic's own SSE event schema.
 */

const API_KEY_STORAGE_KEY = "ai_api_key";
const BASE_URL_STORAGE_KEY = "ai_base_url";
const MODEL_STORAGE_KEY = "ai_model";
const PROVIDER_KIND_STORAGE_KEY = "ai_provider_kind";

export type ProviderKind = "anthropic" | "openai-compatible";

export const ANTHROPIC_BASE_URL = "https://api.anthropic.com";
export const ANTHROPIC_VERSION = "2023-06-01";

export const DEFAULT_PROVIDER_KIND: ProviderKind = "anthropic";
export const DEFAULT_BASE_URL = ANTHROPIC_BASE_URL;
export const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface ModelPreset {
  id: string;
  label: string;
}

export interface ProviderPreset {
  label: string;
  baseUrl: string;
  kind: ProviderKind;
  models: ModelPreset[];
  keyHint: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    label: "Anthropic (Claude)",
    baseUrl: ANTHROPIC_BASE_URL,
    kind: "anthropic",
    keyHint: "sk-ant-…",
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-1", label: "Claude Opus 4.1" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    label: "OpenRouter (any model)",
    baseUrl: "https://openrouter.ai/api/v1",
    kind: "openai-compatible",
    keyHint: "sk-or-v1-…",
    models: [
      { id: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "openai/gpt-4o", label: "GPT-4o" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
      { id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { id: "qwen/qwen-2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B" },
    ],
  },
  {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    kind: "openai-compatible",
    keyHint: "sk-…",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  {
    label: "Google Gemini (OpenAI-compatible)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    kind: "openai-compatible",
    keyHint: "AIza…",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
  {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    kind: "openai-compatible",
    keyHint: "sk-…",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    kind: "openai-compatible",
    keyHint: "gsk_…",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder 32B" },
    ],
  },
  {
    label: "Local (Ollama / LM Studio)",
    baseUrl: "http://localhost:11434/v1",
    kind: "openai-compatible",
    keyHint: "ollama (any value)",
    models: [
      { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B" },
      { id: "llama3.1:8b", label: "Llama 3.1 8B" },
    ],
  },
];

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
}

export function setApiKey(key: string): void {
  window.localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function clearApiKey(): void {
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/** Strips trailing slashes plus common `/v1` / `/chat/completions` typos for Anthropic. */
export function normalizeBaseUrl(url: string, kind: ProviderKind): string {
  let next = url.trim().replace(/\/+$/, "");
  if (kind === "anthropic") {
    next = next.replace(/\/chat\/completions$/, "").replace(/\/v1$/, "");
    if (!next) next = ANTHROPIC_BASE_URL;
  }
  return next;
}

export function getBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BASE_URL;
  const stored = window.localStorage.getItem(BASE_URL_STORAGE_KEY)?.trim();
  return stored ? stored.replace(/\/+$/, "") : DEFAULT_BASE_URL;
}

export function setBaseUrl(url: string): void {
  window.localStorage.setItem(BASE_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ""));
}

export function getModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return window.localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL;
}

export function setModel(model: string): void {
  window.localStorage.setItem(MODEL_STORAGE_KEY, model.trim());
}

export function getProviderKind(): ProviderKind {
  if (typeof window === "undefined") return DEFAULT_PROVIDER_KIND;
  const stored = window.localStorage.getItem(PROVIDER_KIND_STORAGE_KEY);
  return stored === "anthropic" || stored === "openai-compatible"
    ? stored
    : DEFAULT_PROVIDER_KIND;
}

export function setProviderKind(kind: ProviderKind): void {
  window.localStorage.setItem(PROVIDER_KIND_STORAGE_KEY, kind);
}

export function isAnthropicKey(key: string): boolean {
  return key.trim().startsWith("sk-ant-");
}

export class AiError extends Error {}

function headers(apiKey: string, kind: ProviderKind): Record<string, string> {
  if (kind === "anthropic") {
    return {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }
  const base: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };
  if (typeof window !== "undefined") {
    // OpenRouter attribution headers, harmless elsewhere.
    base["HTTP-Referer"] = window.location.origin;
    base["X-Title"] = "Local AI Code Editor";
  }
  return base;
}

function assertKey(): string {
  const key = getApiKey();
  if (!key) throw new AiError("No API key configured. Open Settings to add one.");
  return key;
}

function extractErrorMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string };
    if (typeof parsed.error === "string") return parsed.error;
    return parsed.error?.message ?? null;
  } catch {
    return null;
  }
}

function describeStatus(status: number, body: string, kind: ProviderKind = "openai-compatible"): string {
  const detail = extractErrorMessage(body);
  if (status === 401 || status === 403) {
    return kind === "anthropic"
      ? "API key rejected by Anthropic."
      : "API key rejected by the provider.";
  }
  if (status === 404) return "Model or endpoint not found. Check the base URL and model name.";
  if (status === 429) return "Rate limited. Try again shortly.";
  if (status === 402) return "Provider reports insufficient credits.";
  return `API error ${status}: ${(detail ?? body).slice(0, 300)}`;
}

/** Lists models from `/models` when the provider supports it. */
export async function listModels(
  apiKey: string,
  baseUrl: string,
  signal?: AbortSignal,
  kind: ProviderKind = "openai-compatible",
): Promise<string[]> {
  if (kind === "anthropic") {
    // Anthropic has no browser-reachable public model list — use the presets.
    return (PROVIDER_PRESETS.find((entry) => entry.kind === "anthropic")?.models ?? []).map(
      (entry) => entry.id,
    );
  }
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
    headers: headers(apiKey.trim(), kind),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new AiError(describeStatus(response.status, await response.text().catch(() => ""), kind));
  }
  const payload = (await response.json()) as { data?: Array<{ id?: string }> };
  return (payload.data ?? [])
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === "string")
    .sort();
}

/** Cheap credential probe: a 1-token completion against the configured model. */
export async function validateCredentials(options: {
  apiKey: string;
  baseUrl: string;
  model: string;
  kind?: ProviderKind;
}): Promise<boolean> {
  const kind = options.kind ?? "openai-compatible";
  const key = options.apiKey.trim();
  const base = normalizeBaseUrl(options.baseUrl, kind);

  if (kind === "openai-compatible" && isAnthropicKey(key)) {
    throw new AiError(
      "That looks like an Anthropic key (sk-ant-…). Switch the provider preset to “Anthropic (Claude)”.",
    );
  }

  const url =
    kind === "anthropic" ? `${base}/v1/messages` : `${base}/chat/completions`;
  const body =
    kind === "anthropic"
      ? {
          model: options.model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }
      : {
          model: options.model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        };

  const response = await fetch(url, {
    method: "POST",
    headers: headers(key, kind),
    body: JSON.stringify(body),
  });
  if (response.ok) return true;
  if (response.status === 401 || response.status === 403) return false;
  throw new AiError(describeStatus(response.status, await response.text().catch(() => ""), kind));
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const CHAT_SYSTEM_PROMPT = `You are an expert pair-programmer embedded in a browser code editor.
You receive the user's active file and a question or instruction.
Answer concisely with markdown. When you propose code changes, output the COMPLETE updated file
inside a single fenced code block tagged with the language, e.g.:

\`\`\`ts
// full updated file contents
\`\`\`

Never truncate the file with comments like "rest unchanged".`;

export const INLINE_SYSTEM_PROMPT = `You are an inline code transformer inside a code editor.
The user gives an instruction and a code snippet. Return ONLY the rewritten code.
No explanations, no commentary, no markdown fences. Preserve the original indentation style.`;

/** Iterates `data:` payloads out of an SSE response body. */
async function* sseFrames(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      yield payload;
    }
  }
}

async function* streamAnthropic(options: {
  system: string;
  messages: ChatTurn[];
  model: string;
  maxTokens: number;
  signal?: AbortSignal | null | undefined;
}): AsyncGenerator<string> {
  const key = assertKey();
  const base = normalizeBaseUrl(getBaseUrl(), "anthropic");
  const response = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: headers(key, "anthropic"),
    signal: options.signal ?? null,
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens,
      system: options.system,
      messages: options.messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new AiError(describeStatus(response.status, text, "anthropic"));
  }

  for await (const payload of sseFrames(response.body)) {
    let event: {
      type?: string;
      delta?: { type?: string; text?: string };
      error?: { message?: string };
    };
    try {
      event = JSON.parse(payload) as typeof event;
    } catch {
      continue; // keep-alive / malformed frame
    }
    if (event.error?.message) throw new AiError(event.error.message);
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      if (event.delta.text) yield event.delta.text;
    }
    // message_start / content_block_start / message_delta / message_stop / ping → ignored
  }
}

async function* streamOpenAiCompatible(options: {
  system: string;
  messages: ChatTurn[];
  model: string;
  maxTokens: number;
  signal?: AbortSignal | null | undefined;
}): AsyncGenerator<string> {
  const key = assertKey();
  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: headers(key, "openai-compatible"),
    signal: options.signal ?? null,
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens,
      stream: true,
      messages: [{ role: "system", content: options.system }, ...options.messages],
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new AiError(describeStatus(response.status, text));
  }

  for await (const payload of sseFrames(response.body)) {
    let event: {
      choices?: Array<{ delta?: { content?: string | null } }>;
      error?: { message?: string };
    };
    try {
      event = JSON.parse(payload) as typeof event;
    } catch {
      continue;
    }
    if (event.error?.message) throw new AiError(event.error.message);
    const chunk = event.choices?.[0]?.delta?.content;
    if (chunk) yield chunk;
  }
}

function streamCompletion(options: {
  system: string;
  messages: ChatTurn[];
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal | null | undefined;
}): AsyncGenerator<string> {
  const resolved = {
    system: options.system,
    messages: options.messages,
    model: options.model ?? getModel(),
    maxTokens: options.maxTokens ?? 4096,
    signal: options.signal ?? null,
  };
  return getProviderKind() === "anthropic"
    ? streamAnthropic(resolved)
    : streamOpenAiCompatible(resolved);
}

export async function streamChat(options: {
  messages: ChatTurn[];
  fileName: string;
  fileContent: string;
  model?: string;
  onDelta: (chunk: string) => void;
  signal?: AbortSignal | null | undefined;
}): Promise<string> {
  const context = `Active file: ${options.fileName}\n\n\`\`\`\n${options.fileContent}\n\`\`\``;
  const turns: ChatTurn[] = options.messages.map((turn, index) =>
    index === options.messages.length - 1 && turn.role === "user"
      ? { role: "user", content: `${context}\n\n---\n\n${turn.content}` }
      : turn,
  );

  let full = "";
  for await (const chunk of streamCompletion({
    system: CHAT_SYSTEM_PROMPT,
    messages: turns,
    ...(options.model ? { model: options.model } : {}),
    signal: options.signal ?? null,
  })) {
    full += chunk;
    options.onDelta(chunk);
  }
  return full;
}

export async function streamInlineEdit(options: {
  instruction: string;
  code: string;
  fileName: string;
  model?: string;
  onDelta: (chunk: string) => void;
  signal?: AbortSignal | null | undefined;
}): Promise<string> {
  const prompt = `File: ${options.fileName}\nInstruction: ${options.instruction}\n\nCode:\n${options.code}`;
  let full = "";
  for await (const chunk of streamCompletion({
    system: INLINE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    ...(options.model ? { model: options.model } : {}),
    signal: options.signal ?? null,
  })) {
    full += chunk;
    options.onDelta(chunk);
  }
  return stripFences(full);
}

export function stripFences(text: string): string {
  const trimmed = text.trim();
  const match = /^```[a-zA-Z0-9+-]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return match?.[1] ?? trimmed;
}

export function extractCodeBlock(markdown: string): string | null {
  const matches = [...markdown.matchAll(/```[a-zA-Z0-9+-]*\n([\s\S]*?)```/g)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1]?.[1]?.replace(/\n$/, "") ?? null;
}
