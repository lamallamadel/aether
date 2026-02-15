# Project Overview

This project is a web-based IDE called "Aether Code", inspired by Sublime Text and Cursor. It is built using React, Vite, and Tailwind CSS. The core editor is powered by CodeMirror 6.

## Key Features

-   **Desktop-like UI:** A responsive and accessible top menu (File, Edit, etc.) and a file explorer.
-   **Tabbed Editor:** Open, close, and switch between multiple files.
-   **CodeMirror 6 Editor:** With features like text wrapping and font size customization. It uses Tree-sitter for parsing in a web worker.
-   **AI Chat Panel:** A chat interface for interacting with an AI, with mock streaming and typing indicators.
-   **Command Palette:** Quickly search for files and execute commands like "Toggle Sidebar", "Ask AI", "Global Search", and "Mission Control".
-   **Global Search:** Search file content (using TF-IDF), filenames, and a knowledge graph (GraphRAG with IndexedDB).
-   **Settings Modal:** Customize editor preferences and AI mode (Cloud/Local).
-   **Mission Control:** A "ghost" worktree to preview changes, with diffing, accept/reject functionality, and a risk assessment badge.
-   **Status Bar:** Real-time performance metrics.

## Architecture

-   **UI Components:** Located in `src/components/`, including the sidebar, editor, chat, command palette, and Mission Control.
-   **State Management:** Uses Zustand for global state, defined in `src/state/`.
-   **Domain Logic:** Core types and mock data are in `src/domain/`.
-   **Engine Logic:** The core "engine" for features like diffing, indexing, text buffers, and JSON-RPC is in `src/services/`.
-   **Web Workers:** The application offloads intensive tasks like indexing (`src/workers/indexer.worker.ts`) and syntax parsing to web workers.

## Development

### Prerequisites

-   Node.js and npm

### Installation

```bash
npm install
```

### Running the development server

```bash
npm run dev
```

### Building for production

```bash
npm run build
```

### Running tests

```bash
npm test
```

## Linting

To run the linter, use the following command:

```bash
npm run lint
```
