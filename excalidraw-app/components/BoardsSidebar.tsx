import React, { useEffect, useState, useRef, useCallback } from "react";
import { BoardStorage, type Board } from "../data/BoardStorage";
import "./BoardsSidebar.scss";

interface Props {
  activeBoardId: string | null;
  onSwitch: (board: Board) => void;
  onSaveBeforeSwitch: () => Promise<void>;
}

type CreatingType = "board" | "folder" | null;

interface ContextMenu {
  anchorEl: HTMLElement;
  board: Board;
}

interface MoveMenu {
  board: Board;
  folders: string[];
}

export const BoardsSidebar: React.FC<Props> = ({
  activeBoardId,
  onSwitch,
  onSaveBeforeSwitch,
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [moveMenu, setMoveMenu] = useState<MoveMenu | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [creating, setCreating] = useState<CreatingType>(null);
  const [newName, setNewName] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const all = await BoardStorage.getAll();
    setBoards(all);
    const active = all.find((b) => b.id === activeBoardId);
    if (active?.folder) {
      setOpenFolders((prev) => new Set([...prev, active.folder]));
    }
  }, [activeBoardId]);

  useEffect(() => { reload(); }, [reload]);

  // focus new name input when form opens
  useEffect(() => {
    if (creating) {
      setTimeout(() => newNameRef.current?.focus(), 30);
    }
  }, [creating]);

  // close menus on outside click
  useEffect(() => {
    if (!contextMenu && !moveMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) setContextMenu(null);
      if (
        moveMenuRef.current &&
        !moveMenuRef.current.contains(e.target as Node)
      ) setMoveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu, moveMenu]);

  const handleSwitch = async (board: Board) => {
    if (board.id === activeBoardId) return;
    await onSaveBeforeSwitch();
    onSwitch(board);
  };

  // ── Inline create form ────────────────────────────────────────────────────
  const openCreate = (type: CreatingType) => {
    setCreating(type);
    setNewName("");
    setNewFolder("");
    setContextMenu(null);
  };

  const cancelCreate = () => {
    setCreating(null);
    setNewName("");
    setNewFolder("");
  };

  const commitCreate = async () => {
    const name = newName.trim();
    if (!name) { cancelCreate(); return; }

    if (creating === "folder") {
      // folder is just a label — create a placeholder board inside it
      // OR we can just open the folder in state so it appears immediately
      // when the user adds a board to it. For now: just add folder to openFolders
      // and show it as empty until a board is moved/created into it.
      // We store it as a special "folder-only" marker board that is hidden.
      await onSaveBeforeSwitch();
      const board = await BoardStorage.createBoard("Untitled", name);
      setOpenFolders((prev) => new Set([...prev, name]));
      await reload();
      onSwitch(board);
    } else {
      await onSaveBeforeSwitch();
      const board = await BoardStorage.createBoard(name, newFolder.trim());
      if (newFolder.trim()) {
        setOpenFolders((prev) => new Set([...prev, newFolder.trim()]));
      }
      await reload();
      onSwitch(board);
    }
    cancelCreate();
  };

  // ── Context menu ─────────────────────────────────────────────────────────
  const openContextMenu = (e: React.MouseEvent, board: Board) => {
    e.preventDefault();
    e.stopPropagation();
    setMoveMenu(null);
    setContextMenu({ anchorEl: e.currentTarget as HTMLElement, board });
  };

  // ── Rename ────────────────────────────────────────────────────────────────
  const handleRename = (board: Board) => {
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

  // ── Move to folder ────────────────────────────────────────────────────────
  const handleMoveFolder = (board: Board) => {
    setContextMenu(null);
    const existingFolders = Array.from(
      new Set(boards.map((b) => b.folder).filter(Boolean)),
    );
    setMoveMenu({ board, folders: existingFolders });
  };

  const commitMove = async (board: Board, folder: string) => {
    await BoardStorage.save({ ...board, folder, updatedAt: Date.now() });
    if (folder) setOpenFolders((prev) => new Set([...prev, folder]));
    setMoveMenu(null);
    await reload();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (board: Board) => {
    setContextMenu(null);
    // inline confirm via a small confirm state would be ideal,
    // but for now show a non-blocking confirm in the sidebar
    if (!window.confirm(`Delete "${board.name}"? This cannot be undone.`)) return;
    await BoardStorage.delete(board.id);
    const remaining = boards.filter((b) => b.id !== board.id);
    if (board.id === activeBoardId && remaining.length > 0) {
      onSwitch(remaining[0]);
    }
    await reload();
  };

  // ── Folder toggle ─────────────────────────────────────────────────────────
  const toggleFolder = (folder: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  // ── Context menu position (always inside sidebar) ────────────────────────
  const getMenuStyle = (): React.CSSProperties => {
    if (!contextMenu || !sidebarRef.current) return {};
    const anchor = contextMenu.anchorEl.getBoundingClientRect();
    const sidebar = sidebarRef.current.getBoundingClientRect();
    // prefer right-aligned to the sidebar inner edge
    return {
      top: anchor.bottom + 2,
      left: Math.min(anchor.left, sidebar.right - 148),
    };
  };

  const getMoveMenuStyle = (): React.CSSProperties => {
    if (!moveMenu || !sidebarRef.current) return {};
    const sidebar = sidebarRef.current.getBoundingClientRect();
    return {
      top: sidebar.top + 80,
      left: sidebar.left + 8,
      width: sidebar.width - 16,
    };
  };

  // ── Grouping ──────────────────────────────────────────────────────────────
  const folders = Array.from(
    new Set(boards.map((b) => b.folder).filter(Boolean)),
  ).sort() as string[];
  const rootBoards = boards.filter((b) => !b.folder);

  const renderItem = (board: Board) => (
    <div
      key={board.id}
      className={`boards-sidebar__item${board.id === activeBoardId ? " is-active" : ""}`}
      onClick={() => handleSwitch(board)}
      onContextMenu={(e) => openContextMenu(e, board)}
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
        onClick={(e) => { e.stopPropagation(); openContextMenu(e, board); }}
        title="Board options"
      >
        ···
      </button>
    </div>
  );

  return (
    <div className="boards-sidebar" ref={sidebarRef}>
      {/* Header */}
      <div className="boards-sidebar__header">
        <span>Boards</span>
        <div className="boards-sidebar__header-actions">
          <button
            className="boards-sidebar__new-btn"
            onClick={() => openCreate("board")}
            title="New board"
          >
            + Board
          </button>
          <button
            className="boards-sidebar__new-btn boards-sidebar__new-btn--folder"
            onClick={() => openCreate("folder")}
            title="New folder"
          >
            + Folder
          </button>
        </div>
      </div>

      {/* Inline create form */}
      {creating && (
        <div className="boards-sidebar__create-form">
          <div className="boards-sidebar__create-label">
            {creating === "folder" ? "New folder" : "New board"}
          </div>
          <input
            ref={newNameRef}
            className="boards-sidebar__create-input"
            placeholder={creating === "folder" ? "Folder name" : "Board name"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreate();
              if (e.key === "Escape") cancelCreate();
              e.stopPropagation();
            }}
          />
          {creating === "board" && (
            <input
              className="boards-sidebar__create-input"
              placeholder="Folder (optional)"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreate();
                if (e.key === "Escape") cancelCreate();
                e.stopPropagation();
              }}
            />
          )}
          <div className="boards-sidebar__create-actions">
            <button className="boards-sidebar__create-confirm" onClick={commitCreate}>
              Create
            </button>
            <button className="boards-sidebar__create-cancel" onClick={cancelCreate}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Board list */}
      <div className="boards-sidebar__scroll">
        {boards.length === 0 && !creating && (
          <div className="boards-sidebar__empty">
            No boards yet.
            <br />
            Click <strong>+ Board</strong> to create one.
          </div>
        )}

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

        {rootBoards.map(renderItem)}
      </div>

      {/* Context menu — anchored inside sidebar */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="boards-sidebar__context-menu"
          style={getMenuStyle()}
        >
          <button onClick={() => handleRename(contextMenu.board)}>Rename</button>
          <button onClick={() => handleMoveFolder(contextMenu.board)}>
            Move to folder
          </button>
          <button className="danger" onClick={() => handleDelete(contextMenu.board)}>
            Delete
          </button>
        </div>
      )}

      {/* Move to folder picker */}
      {moveMenu && (
        <div
          ref={moveMenuRef}
          className="boards-sidebar__context-menu"
          style={getMoveMenuStyle()}
        >
          <div className="boards-sidebar__move-label">Move to folder</div>
          <button onClick={() => commitMove(moveMenu.board, "")}>
            📄 Root (no folder)
          </button>
          {moveMenu.folders.map((f) => (
            <button key={f} onClick={() => commitMove(moveMenu.board, f)}>
              📁 {f}
            </button>
          ))}
          <div className="boards-sidebar__move-divider" />
          <div className="boards-sidebar__move-new">
            <input
              className="boards-sidebar__create-input"
              placeholder="New folder name…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) commitMove(moveMenu.board, val);
                }
                e.stopPropagation();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
