import Dexie, { type Table } from "dexie";

export type NodeKind = "file" | "folder";

export interface FileNode {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  kind: NodeKind;
  content: string;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export type TaskStatus = "success" | "error" | "pending";

export interface TaskHistoryEntry {
  id: string;
  projectId: string;
  prompt: string;
  targetFile: string;
  source: "chat" | "command-bar";
  status: TaskStatus;
  detail?: string;
  createdAt: number;
}

export class IdeDatabase extends Dexie {
  projects!: Table<Project, string>;
  files!: Table<FileNode, string>;
  taskHistory!: Table<TaskHistoryEntry, string>;

  constructor() {
    super("antigravity-ide");
    this.version(1).stores({
      projects: "id, name, createdAt",
      files: "id, projectId, parentId, name, kind, updatedAt",
      taskHistory: "id, projectId, createdAt, status",
    });
  }
}

export const db = new IdeDatabase();

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const DEFAULT_PROJECT_ID = "default-project";

const STARTER_FILES: Array<{ name: string; content: string }> = [
  {
    name: "README.md",
    content:
      "# Local Workspace\n\nEverything here lives in your browser (IndexedDB).\n\n- `Ctrl/Cmd + K` — inline AI edit\n- Right panel — AI chat & history\n",
  },
  {
    name: "main.ts",
    content:
      'export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("world"));\n',
  },
];

export async function ensureSeedData(): Promise<void> {
  const existing = await db.projects.get(DEFAULT_PROJECT_ID);
  if (existing) return;

  await db.projects.put({
    id: DEFAULT_PROJECT_ID,
    name: "workspace",
    createdAt: Date.now(),
  });

  await db.files.bulkPut(
    STARTER_FILES.map((file) => ({
      id: uid(),
      projectId: DEFAULT_PROJECT_ID,
      parentId: null,
      name: file.name,
      kind: "file" as const,
      content: file.content,
      updatedAt: Date.now(),
    })),
  );
}

export async function createNode(input: {
  name: string;
  kind: NodeKind;
  parentId: string | null;
}): Promise<string> {
  const id = uid();
  await db.files.put({
    id,
    projectId: DEFAULT_PROJECT_ID,
    parentId: input.parentId,
    name: input.name,
    kind: input.kind,
    content: "",
    updatedAt: Date.now(),
  });
  return id;
}

export async function renameNode(id: string, name: string): Promise<void> {
  await db.files.update(id, { name, updatedAt: Date.now() });
}

export async function saveFileContent(id: string, content: string): Promise<void> {
  await db.files.update(id, { content, updatedAt: Date.now() });
}

export async function deleteNode(id: string): Promise<string[]> {
  const all = await db.files.where({ projectId: DEFAULT_PROJECT_ID }).toArray();
  const removed: string[] = [];
  const walk = (nodeId: string) => {
    removed.push(nodeId);
    all.filter((node) => node.parentId === nodeId).forEach((child) => walk(child.id));
  };
  walk(id);
  await db.files.bulkDelete(removed);
  return removed;
}

export async function logTask(
  entry: Omit<TaskHistoryEntry, "id" | "projectId" | "createdAt">,
): Promise<void> {
  await db.taskHistory.put({
    ...entry,
    id: uid(),
    projectId: DEFAULT_PROJECT_ID,
    createdAt: Date.now(),
  });
}
