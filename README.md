# Local Coder Buddy

Act as a Senior Principal Frontend Engineer. Build a lightweight, local-first, AI-powered Web & PWA Code Editor inspired by Google Antigravity / Cursor.



TARGET AUDIENCE & USE CASE:

- Single-user personal tool running entirely in the browser (no auth, no backend server, no cloud sync).

- Must work as a responsive Web Web App and be fully installable on Android via Progressive Web App (PWA) standards ("Add to Home Screen").



TECH STACK:

- Build Tool: Vite + React (TypeScript)

- Styling: Tailwind CSS (Dark theme / Minimalist IDE aesthetic)

- Editor Engine: @monaco-editor/react

- State & Storage: Dexie.js (IndexedDB wrapper for local project/file persistence)

- PWA Support: vite-plugin-pwa

- AI Integration: Direct client-side calls to Anthropic API (@anthropic-ai/sdk using `dangerouslyAllowBrowser: true` or direct REST API via fetch). User key stored securely in browser's `localStorage`.



PROJECT ARCHITECTURE & FILE STRUCTURE:

src/

├── components/

│   ├── Sidebar/ (File Explorer tree, Create/Delete/Rename controls)

│   ├── Editor/ (Monaco Wrapper with active tab management)

│   ├── AIChat/ (Side panel for chat, diff viewing, and "Apply Changes" button)

│   ├── CommandBar/ (Cmd+K / Ctrl+K inline code modification modal)

│   ├── History/ (Task history showing last AI actions and timestamps)

│   └── SettingsModal.tsx (Anthropic API Key configuration)

├── lib/

│   ├── db.ts (Dexie IndexedDB schemas: files, projects, taskHistory)

│   └── aiService.ts (Anthropic Claude API helper with diff generator prompt)

├── context/ or store/ (App state management using React Context or Zustand)

└── App.tsx



DETAILED FEATURE SPECIFICATIONS:



1. File Management (IndexedDB Persisted):

   - Create, edit, rename, and delete files/folders in a virtual workspace.

   - Auto-save file updates to IndexedDB on every keystroke/change.



2. Code Editor:

   - Full Monaco Editor instance with dynamic language syntax highlighting based on file extension (.ts, .jsx, .html, .py, .json, etc.).

   - Support for line numbers, dark mode, minimap, and auto-formatting.



3. AI Chat Side Panel:

   - Slide-over / docked side drawer.

   - User inputs prompt -> Send current active file content + user query to Claude.

   - AI responds with explanations + proposed code changes formatted as a diff or markdown block.

   - Include a 1-click "Apply Code to Active File" action button.



4. Inline AI Command Bar (Ctrl+K / Cmd+K):

   - Global keyboard shortcut opens a centered modal bar.

   - User inputs instruction (e.g., "Refactor this function to be async", "Add TypeScript types").

   - AI streams changes directly inline into the selection or active file.



5. History & Audit Log:

   - Panel listing past AI executions (Prompt, Target File, Timestamp, Status).



6. PWA Integration:

   - Web App Manifest (icons, standalone display mode, theme colors).

   - Basic Service Worker for offline app loading.



DEVELOPMENT STEP-BY-STEP INSTRUCTIONS:

Step 1: Scaffold the Vite + React + Tailwind + PWA boilerplate.

Step 2: Create the IndexedDB persistence layer and File Explorer UI.

Step 3: Integrate Monaco Editor with tab management.

Step 4: Build Settings Modal for storing and validating the Anthropic API Key in localStorage.

Step 5: Implement AI Chat & Cmd+K features using the configured Anthropic API Key.



Please generate clean, 

fully typed TypeScript code for the core application components.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://code-muse-90.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f6497fb4-f8ef-45a5-bdfc-0c9fb5d5d55c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
