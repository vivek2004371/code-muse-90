const API_KEY_STORAGE_KEY = "anthropic_api_key";
const MODEL_STORAGE_KEY = "anthropic_model";

export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export const AVAILABLE_MODELS = [
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-1-20250805",
  "claude-3-5-haiku-20241022",
] as const;

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

export function getModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return window.localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL;
}

export function setModel(model: string): void {
  window.localStorage.setItem(MODEL_STORAGE_KEY, model);
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function headers(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

export class AiError extends Error {}

function assertKey(): string {
  const key = getApiKey();
  if (!key) throw new AiError("No Anthropic API key configured. Open Settings to add one.");
  return key;
}

export async function validateApiKey(key: string): Promise<boolean> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: headers(key.trim()),
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 8,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (response.ok) return true;
  if (response.status === 401 || response.status === 403) return false;
  const text = await response.text();
  throw new AiError(`Anthropic API error ${response.status}: ${text.slice(0, 300)}`);
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

async function* streamMessage(options: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const key = assertKey();
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: headers(key),
    signal: options.signal,
    body: JSON.stringify({
      model: getModel(),
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
      system: options.system,
      messages: options.messages,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    if (response.status === 401) throw new AiError("Invalid Anthropic API key.");
    if (response.status === 429) throw new AiError("Rate limited by Anthropic. Try again shortly.");
    throw new AiError(`Anthropic API error ${response.status}: ${text.slice(0, 300)}`);
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
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type: string;
          delta?: { type?: string; text?: string };
        };
        if (event.type === "content_block_delta" && event.delta?.text) {
          yield event.delta.text;
        }
      } catch {
        // ignore malformed keep-alive frames
      }
    }
  }
}

export async function streamChat(options: {
  messages: ChatTurn[];
  fileName: string;
  fileContent: string;
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const context = `Active file: ${options.fileName}\n\n\`\`\`\n${options.fileContent}\n\`\`\``;
  const turns: ChatTurn[] = options.messages.map((turn, index) =>
    index === options.messages.length - 1 && turn.role === "user"
      ? { role: "user", content: `${context}\n\n---\n\n${turn.content}` }
      : turn,
  );

  let full = "";
  for await (const chunk of streamMessage({
    system: CHAT_SYSTEM_PROMPT,
    messages: turns,
    signal: options.signal,
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
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const prompt = `File: ${options.fileName}\nInstruction: ${options.instruction}\n\nCode:\n${options.code}`;
  let full = "";
  for await (const chunk of streamMessage({
    system: INLINE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    signal: options.signal,
  })) {
    full += chunk;
    options.onDelta(chunk);
  }
  return stripFences(full);
}

export function stripFences(text: string): string {
  const trimmed = text.trim();
  const match = /^```[a-zA-Z0-9+-]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return match ? match[1] : trimmed;
}

export function extractCodeBlock(markdown: string): string | null {
  const matches = [...markdown.matchAll(/```[a-zA-Z0-9+-]*\n([\s\S]*?)```/g)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1].replace(/\n$/, "");
}
