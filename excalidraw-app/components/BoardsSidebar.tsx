import React, { useEffect, useState, useRef, useCallback } from "react";
import { BoardStorage, type Board } from "../data/BoardStorage";
import "./BoardsSidebar.scss";

interface Props {
  activeBoardId: string | null;
  onSwitch: (board: Board) => void;
  onSaveBeforeSwitch: () => Promise<void>;
}

interface ContextMenu {
  x: number;
  y: number;
  board: Board;
}

export const BoardsSidebar: React.FC<Props> = ({
  activeBoardId,
  onSwitch,
  onSaveBeforeSwitch,
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const all = await BoardStorage.getAll();
    setBoards(all);
    // auto-open all folders that contain the active board
    const active = all.find((b) => b.id === activeBoardId);
    if (active?.folder) {
      setOpenFolders((prev) => new Set([...prev, active.folder]));
    }
  }, [activeBoardId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  const handleSwitch = async (board: Board) => {
    if (board.id === activeBoardId) return;
    await onSaveBeforeSwitch();
    onSwitch(board);
  };

  const handleNew = async () => {
    const name = window.prompt("Board name:", "Untitled");
    if (name === null) return;
    const folder = window.prompt("Folder (leave blank for root):", "") ?? "";
    await onSaveBeforeSwitch();
    const board = await BoardStorage.createBoard(name, folder);
    await reload();
    onSwitch(board);
  };

  const handleContextMenu = (e: React.MouseEvent, board: Board) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, board });
  };

  const handleRename = async (board: Board) => {
    setContextMenu(null);
    setEditingId(board.id);
    setEditingValue(board.name);
  };

  const commitRename = async (board: Board) => {
    const name = editingValue.trim() || board.name;
    await BoardStorage.save({ ...board, name, updatedAt: Date.now() });
    setEditingId(null);
    await reload();
  };

  const handleMoveFolder = async (board: Board) => {
    setContextMenu(null);
    const folder =
      window.prompt("Move to folder (blank = root):", board.folder) ?? board.folder;
    await BoardStorage.save({ ...board, folder, updatedAt: Date.now() });
    await reload();
  };

  const handleDelete = async (board: Board) => {
    setContextMenu(null);
    if (!window.confirm(`Delete "${board.name}"? This cannot be undone.`)) return;
    await BoardStorage.delete(board.id);
    const remaining = boards.filter((b) => b.id !== board.id);
    if (board.id === activeBoardId && remaining.length > 0) {
      onSwitch(remaining[0]);
    }
    await reload();
  };

  const toggleFolder = (folder: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  // group boards by folder
  const folders = Array.from(new Set(boards.map((b) => b.folder).filter(Boolean))).sort();
  const rootBoards = boards.filter((b) => !b.folder);

  const renderItem = (board: Board) => (
    <div
      key={board.id}
      className={`boards-sidebar__item${board.id === activeBoardId ? " is-active" : ""}`}
      onClick={() => handleSwitch(board)}
      onContextMenu={(e) => handleContextMenu(e, board)}
    >
      <span className="boards-sidebar__item-icon">📄</span>
      {editingId === board.id ? (
        <input
          className="boards-sidebar__inline-input"
          value={editingValue}
          autoFocus
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename(board);
            if (e.key === "Escape") setEditingId(null);
            e.stopPropagation();
          }}
          onBlur={() => commitRename(board)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="boards-sidebar__item-name">{board.name}</span>
      )}
      <span className="boards-sidebar__item-dot" />
      <button
        className="boards-sidebar__item-menu"
        onClick={(e) => {
          e.stopPropagation();
          handleContextMenu(e as unknown as React.MouseEvent, board);
        }}
        title="Board options"
      >
        ···
      </button>
    </div>
  );

  return (
    <div className="boards-sidebar">
      <div className="boards-sidebar__header">
        <span>Boards</span>
        <button className="boards-sidebar__new-btn" onClick={handleNew}>
          + New
        </button>
      </div>

      <div className="boards-sidebar__scroll">
        {boards.length === 0 && (
          <div className="boards-sidebar__empty">
            No boards yet.
            <br />
            Click <strong>+ New</strong> to create one.
          </div>
        )}

        {/* Folders */}
        {folders.map((folder) => {
          const items = boards.filter((b) => b.folder === folder);
          const isOpen = openFolders.has(folder);
          return (
            <div key={folder} className="boards-sidebar__folder">
              <div
                className={`boards-sidebar__folder-header${isOpen ? " is-open" : ""}`}
                onClick={() => toggleFolder(folder)}
              >
                <svg viewBox="0 0 6 10" fill="currentColor">
                  <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                📁 {folder}
              </div>
              {isOpen && (
                <div className="boards-sidebar__folder-items">
                  {items.map(renderItem)}
                </div>
              )}
            </div>
          );
        })}

        {/* Root boards */}
        {rootBoards.map(renderItem)}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="boards-sidebar__context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => handleRename(contextMenu.board)}>Rename</button>
          <button onClick={() => handleMoveFolder(contextMenu.board)}>
            Move to folder
          </button>
          <button
            className="danger"
            onClick={() => handleDelete(contextMenu.board)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
