/**
 * Universal AI adapter.
 *
 * Speaks the OpenAI `/chat/completions` wire format, which is supported by
 * OpenRouter, OpenAI, Groq, DeepSeek, Together, Ollama, LM Studio, vLLM and
 * virtually every hosted or local LLM runtime. Point the base URL anywhere.
 */

const API_KEY_STORAGE_KEY = "ai_api_key";
const BASE_URL_STORAGE_KEY = "ai_base_url";
const MODEL_STORAGE_KEY = "ai_model";

export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "google/gemini-flash-1.5";

export interface ModelPreset {
  id: string;
  label: string;
}

export interface ProviderPreset {
  label: string;
  baseUrl: string;
  models: ModelPreset[];
  keyHint: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    label: "OpenRouter (any model)",
    baseUrl: "https://openrouter.ai/api/v1",
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
    keyHint: "sk-…",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  {
    label: "Google Gemini (OpenAI-compatible)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyHint: "AIza…",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
  {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    keyHint: "sk-…",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keyHint: "gsk_…",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder 32B" },
    ],
  },
  {
    label: "Local (Ollama / LM Studio)",
    baseUrl: "http://localhost:11434/v1",
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

export class AiError extends Error {}

function headers(apiKey: string): Record<string, string> {
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

function describeStatus(status: number, body: string): string {
  if (status === 401 || status === 403) return "API key rejected by the provider.";
  if (status === 404) return "Model or endpoint not found. Check the base URL and model name.";
  if (status === 429) return "Rate limited. Try again shortly.";
  if (status === 402) return "Provider reports insufficient credits.";
  return `API error ${status}: ${body.slice(0, 300)}`;
}

/** Lists models from `/models` when the provider supports it. */
export async function listModels(
  apiKey: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
    headers: headers(apiKey.trim()),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new AiError(describeStatus(response.status, await response.text().catch(() => "")));
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
}): Promise<boolean> {
  const response = await fetch(`${options.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: headers(options.apiKey.trim()),
    body: JSON.stringify({
      model: options.model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (response.ok) return true;
  if (response.status === 401 || response.status === 403) return false;
  throw new AiError(describeStatus(response.status, await response.text().catch(() => "")));
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

async function* streamCompletion(options: {
  system: string;
  messages: ChatTurn[];
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal | null | undefined;
}): AsyncGenerator<string> {
  const key = assertKey();
  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: headers(key),
    signal: options.signal ?? null,
    body: JSON.stringify({
      model: options.model ?? getModel(),
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
      messages: [
        { role: "system", content: options.system },
        ...options.messages,
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new AiError(describeStatus(response.status, text));
  }

  const reader = response.body.getReader();
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
      try {
        const event = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string | null } }>;
          error?: { message?: string };
        };
        if (event.error?.message) throw new AiError(event.error.message);
        const chunk = event.choices?.[0]?.delta?.content;
        if (chunk) yield chunk;
      } catch (error) {
        if (error instanceof AiError) throw error;
        // ignore malformed keep-alive frames
      }
    }
  }
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
