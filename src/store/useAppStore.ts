import { create } from "zustand";

export type PanelTab = "chat" | "history";

interface AppState {
  openTabs: string[];
  activeFileId: string | null;
  panelOpen: boolean;
  panelTab: PanelTab;
  settingsOpen: boolean;
  commandBarOpen: boolean;
  sidebarOpen: boolean;
  openFile: (id: string) => void;
  closeTab: (id: string) => void;
  removeFiles: (ids: string[]) => void;
  setActiveFile: (id: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelTab: (tab: PanelTab) => void;
  setSettingsOpen: (open: boolean) => void;
  setCommandBarOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  openTabs: [],
  activeFileId: null,
  panelOpen: false,
  panelTab: "chat",
  settingsOpen: false,
  commandBarOpen: false,
  sidebarOpen: false,
  openFile: (id) =>
    set((state) => ({
      openTabs: state.openTabs.includes(id) ? state.openTabs : [...state.openTabs, id],
      activeFileId: id,
      sidebarOpen: false,
    })),
  closeTab: (id) =>
    set((state) => {
      const openTabs = state.openTabs.filter((tab) => tab !== id);
      const activeFileId =
        state.activeFileId === id ? (openTabs[openTabs.length - 1] ?? null) : state.activeFileId;
      return { openTabs, activeFileId };
    }),
  removeFiles: (ids) =>
    set((state) => {
      const openTabs = state.openTabs.filter((tab) => !ids.includes(tab));
      const activeFileId =
        state.activeFileId && ids.includes(state.activeFileId)
          ? (openTabs[openTabs.length - 1] ?? null)
          : state.activeFileId;
      return { openTabs, activeFileId };
    }),
  setActiveFile: (id) => set({ activeFileId: id }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setPanelTab: (panelTab) => set({ panelTab, panelOpen: true }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setCommandBarOpen: (commandBarOpen) => set({ commandBarOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
