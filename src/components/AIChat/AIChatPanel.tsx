import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUp, Check, Loader2, Sparkle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AiError,
  extractCodeBlock,
  getApiKey,
  streamChat,
  type ChatTurn,
} from "@/lib/aiService";
import { db, logTask, saveFileContent, type FileNode } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";

interface ChatMessage extends ChatTurn {
  id: string;
}

function MessageBody({ content }: { content: string }) {
  const segments = content.split(/(```[a-zA-Z0-9+-]*\n[\s\S]*?```)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {segments.filter(Boolean).map((segment, index) =>
        segment.startsWith("```") ? (
          <pre
            key={index}
            className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-xs text-foreground"
          >
            <code>{segment.replace(/^```[a-zA-Z0-9+-]*\n/, "").replace(/```$/, "")}</code>
          </pre>
        ) : (
          <p key={index} className="whitespace-pre-wrap text-foreground/90">
            {segment.trim()}
          </p>
        ),
      )}
    </div>
  );
}

export function AIChatPanel() {
  const activeFileId = useAppStore((state) => state.activeFileId);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeFile =
    useLiveQuery<FileNode | null, FileNode | null>(
      async () => (activeFileId ? ((await db.files.get(activeFileId)) ?? null) : null),
      [activeFileId],
      null,
    ) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    if (!getApiKey()) {
      toast.error("Add your Anthropic API key first.");
      setSettingsOpen(true);
      return;
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
    const assistantId = crypto.randomUUID();
    const history: ChatTurn[] = [...messages, userMessage].map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setBusy(true);

    try {
      await streamChat({
        messages: history,
        fileName: activeFile?.name ?? "untitled",
        fileContent: activeFile?.content ?? "",
        onDelta: (chunk) =>
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          ),
      });
      await logTask({
        prompt,
        targetFile: activeFile?.name ?? "—",
        source: "chat",
        status: "success",
      });
    } catch (error) {
      const detail = error instanceof AiError ? error.message : "Request failed.";
      toast.error(detail);
      setMessages((prev) => prev.filter((message) => message.id !== assistantId));
      await logTask({
        prompt,
        targetFile: activeFile?.name ?? "—",
        source: "chat",
        status: "error",
        detail,
      });
    } finally {
      setBusy(false);
    }
  };

  const applyCode = async (content: string) => {
    const code = extractCodeBlock(content);
    if (!code) {
      toast.error("No code block found in that reply.");
      return;
    }
    if (!activeFileId) {
      toast.error("Open a file first.");
      return;
    }
    await saveFileContent(activeFileId, code);
    toast.success(`Applied changes to ${activeFile?.name ?? "file"}`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          context: {activeFile?.name ?? "no file"}
        </span>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          title="Clear conversation"
          onClick={() => setMessages([])}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <Sparkle className="size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Ask about the active file, or request a rewrite.
            </p>
          </div>
        )}
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                {message.content}
              </div>
            </div>
          ) : (
            <div key={message.id} className="space-y-2">
              {message.content ? (
                <MessageBody content={message.content} />
              ) : (
                <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>
              )}
              {message.content.includes("```") && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  onClick={() => void applyCode(message.content)}
                >
                  <Check className="size-3.5" /> Apply code to active file
                </button>
              )}
            </div>
          ),
        )}
      </div>

      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 focus-within:border-primary/60">
          <textarea
            value={input}
            rows={2}
            placeholder="Ask Claude about this file…"
            className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            disabled={busy || !input.trim()}
            className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            onClick={() => void send()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
