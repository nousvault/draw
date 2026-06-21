import { createStore, get, set, del, keys } from "idb-keyval";

export interface Board {
  id: string;
  name: string;
  folder: string; // "" = root
  elements: string; // JSON
  appState: string; // JSON (subset)
  files: string; // JSON
  createdAt: number;
  updatedAt: number;
}

const ACTIVE_BOARD_KEY = "excalidraw-active-board-id";

const boardsStore = createStore("boards-db", "boards-store");

export const BoardStorage = {
  async getAll(): Promise<Board[]> {
    try {
      const allKeys = await keys(boardsStore);
      const boards = await Promise.all(
        allKeys.map((k) => get<Board>(k, boardsStore)),
      );
      return (boards.filter(Boolean) as Board[]).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
    } catch {
      return [];
    }
  },

  async get(id: string): Promise<Board | undefined> {
    try {
      return await get<Board>(id, boardsStore);
    } catch {
      return undefined;
    }
  },

  async save(board: Board): Promise<void> {
    await set(board.id, board, boardsStore);
  },

  async delete(id: string): Promise<void> {
    await del(id, boardsStore);
  },

  getActiveId(): string | null {
    return localStorage.getItem(ACTIVE_BOARD_KEY);
  },

  setActiveId(id: string): void {
    localStorage.setItem(ACTIVE_BOARD_KEY, id);
  },

  generateId(): string {
    return `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },

  async createBoard(name: string, folder: string): Promise<Board> {
    const board: Board = {
      id: BoardStorage.generateId(),
      name: name.trim() || "Untitled",
      folder: folder.trim(),
      elements: "[]",
      appState: "{}",
      files: "{}",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await BoardStorage.save(board);
    return board;
  },

  /** On first load: migrate existing localStorage scene into a board */
  async migrateFromLocalStorage(): Promise<Board | null> {
    try {
      const elements = localStorage.getItem("excalidraw") || "[]";
      const appState = localStorage.getItem("excalidraw-state") || "{}";
      const board: Board = {
        id: BoardStorage.generateId(),
        name: "Untitled",
        folder: "",
        elements,
        appState,
        files: "{}",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await BoardStorage.save(board);
      return board;
    } catch {
      return null;
    }
  },
};
