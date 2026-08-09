import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Toaster } from "@/components/ui/sonner";

const IdeApp = lazy(() => import("@/components/IdeApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "antigrav.dev — Local-First AI Code Editor" },
      {
        name: "description",
        content:
          "A browser-native, installable AI code editor: Monaco editing, IndexedDB projects, and multi-model inline edits — all local.",
      },
      { property: "og:title", content: "antigrav.dev — Local-First AI Code Editor" },
      {
        property: "og:description",
        content:
          "Monaco editor, IndexedDB workspace, multi-model AI chat and Ctrl+K inline edits. Installable PWA, no backend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0b0d10" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  component: Index,
});

function LoadingShell() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background">
      <p className="animate-pulse font-mono text-sm text-muted-foreground">booting workspace…</p>
    </div>
  );
}

function Index() {
  return (
    <>
      <ClientOnly fallback={<LoadingShell />}>
        <Suspense fallback={<LoadingShell />}>
          <IdeApp />
        </Suspense>
      </ClientOnly>
      <Toaster />
    </>
  );
}
