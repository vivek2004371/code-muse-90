import { Files, History as HistoryIcon, MessageSquare, Settings, Terminal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AIChatPanel } from "@/components/AIChat/AIChatPanel";
import { CommandBar } from "@/components/CommandBar/CommandBar";
import { EditorPane } from "@/components/Editor/EditorPane";
import { HistoryPanel } from "@/components/History/HistoryPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { FileExplorer } from "@/components/Sidebar/FileExplorer";
import { ensureSeedData } from "@/lib/db";
import { registerServiceWorker } from "@/lib/register-sw";
import { useAppStore } from "@/store/useAppStore";

export default function IdeApp() {
  const [ready, setReady] = useState(false);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const panelOpen = useAppStore((state) => state.panelOpen);
  const setPanelOpen = useAppStore((state) => state.setPanelOpen);
  const panelTab = useAppStore((state) => state.panelTab);
  const setPanelTab = useAppStore((state) => state.setPanelTab);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const setCommandBarOpen = useAppStore((state) => state.setCommandBarOpen);

  useEffect(() => {
    void ensureSeedData().finally(() => setReady(true));
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandBarOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCommandBarOpen]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-2">
        <button
          type="button"
          aria-label="Toggle explorer"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Files className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          <h1 className="font-mono text-sm font-semibold tracking-tight">antigrav.dev</h1>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="hidden rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground sm:inline-flex"
            onClick={() => setCommandBarOpen(true)}
          >
            ⌘K inline edit
          </button>
          <button
            type="button"
            aria-label="AI chat"
            className={`rounded-md p-1.5 hover:bg-muted ${panelOpen && panelTab === "chat" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => (panelOpen && panelTab === "chat" ? setPanelOpen(false) : setPanelTab("chat"))}
          >
            <MessageSquare className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Task history"
            className={`rounded-md p-1.5 hover:bg-muted ${panelOpen && panelTab === "history" ? "text-primary" : "text-muted-foreground"}`}
            onClick={() =>
              panelOpen && panelTab === "history" ? setPanelOpen(false) : setPanelTab("history")
            }
          >
            <HistoryIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block">
          <FileExplorer />
        </aside>

        {sidebarOpen && (
          <div className="absolute inset-0 z-30 flex md:hidden">
            <div className="w-64 border-r border-sidebar-border bg-sidebar">
              <FileExplorer />
            </div>
            <button
              type="button"
              aria-label="Close explorer"
              className="flex-1 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
          </div>
        )}

        <main className="min-w-0 flex-1">{ready ? <EditorPane /> : null}</main>

        {panelOpen && (
          <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl lg:static lg:z-auto lg:w-96 lg:shadow-none">
            <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-2">
              {(["chat", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`rounded px-2 py-1 text-xs capitalize ${
                    panelTab === tab ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => setPanelTab(tab)}
                >
                  {tab}
                </button>
              ))}
              <button
                type="button"
                aria-label="Close panel"
                className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setPanelOpen(false)}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {panelTab === "chat" ? <AIChatPanel /> : <HistoryPanel />}
            </div>
          </aside>
        )}
      </div>

      <CommandBar />
      <SettingsModal />
    </div>
  );
}
