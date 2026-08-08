import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  FilePlus2,
  Folder,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createNode, db, deleteNode, renameNode, type FileNode } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";

function useNodes(): FileNode[] {
  return useLiveQuery(() => db.files.toArray(), [], [] as FileNode[]) ?? [];
}

interface TreeProps {
  nodes: FileNode[];
  parentId: string | null;
  depth: number;
  onCreate: (parentId: string | null, kind: "file" | "folder") => void;
}

function Tree({ nodes, parentId, depth, onCreate }: TreeProps) {
  const children = nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1));

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const openFile = useAppStore((state) => state.openFile);
  const activeFileId = useAppStore((state) => state.activeFileId);
  const removeFiles = useAppStore((state) => state.removeFiles);

  const handleRename = async (node: FileNode) => {
    const next = window.prompt("Rename", node.name);
    if (!next?.trim()) return;
    await renameNode(node.id, next.trim());
  };

  const handleDelete = async (node: FileNode) => {
    if (!window.confirm(`Delete "${node.name}"?`)) return;
    const removed = await deleteNode(node.id);
    removeFiles(removed);
    toast.success(`Deleted ${node.name}`);
  };

  return (
    <ul className="select-none">
      {children.map((node) => {
        const isFolder = node.kind === "folder";
        const isCollapsed = collapsed[node.id] ?? false;
        const isActive = activeFileId === node.id;
        return (
          <li key={node.id}>
            <div
              className={`group flex items-center gap-1 rounded-sm py-1 pr-1 text-sm transition-colors ${
                isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
              }`}
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                onClick={() =>
                  isFolder
                    ? setCollapsed((prev) => ({ ...prev, [node.id]: !isCollapsed }))
                    : openFile(node.id)
                }
              >
                {isFolder ? (
                  <>
                    {isCollapsed ? (
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <Folder className="size-3.5 shrink-0 text-primary" />
                  </>
                ) : (
                  <FileIcon className="ml-3.5 size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate font-mono text-xs">{node.name}</span>
              </button>
              <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {isFolder && (
                  <button
                    type="button"
                    title="New file in folder"
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => onCreate(node.id, "file")}
                  >
                    <FilePlus2 className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  title="Rename"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => void handleRename(node)}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleDelete(node)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
            {isFolder && !isCollapsed && (
              <Tree nodes={nodes} parentId={node.id} depth={depth + 1} onCreate={onCreate} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FileExplorer() {
  const nodes = useNodes();
  const openFile = useAppStore((state) => state.openFile);

  const handleCreate = async (parentId: string | null, kind: "file" | "folder") => {
    const name = window.prompt(kind === "file" ? "New file name" : "New folder name");
    if (!name?.trim()) return;
    const id = await createNode({ name: name.trim(), kind, parentId });
    if (kind === "file") openFile(id);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Explorer
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            title="New file"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => void handleCreate(null, "file")}
          >
            <FilePlus2 className="size-4" />
          </button>
          <button
            type="button"
            title="New folder"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => void handleCreate(null, "folder")}
          >
            <FolderPlus className="size-4" />
          </button>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1.5 pr-1">
        {nodes.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground">
            No files yet. Create one to get started.
          </p>
        ) : (
          <Tree nodes={nodes} parentId={null} depth={0} onCreate={handleCreate} />
        )}
      </div>
    </div>
  );
}
