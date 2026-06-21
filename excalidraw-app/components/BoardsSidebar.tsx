import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { BoardStorage, type Board } from "../data/BoardStorage";
import "./BoardsSidebar.scss";

interface Props {
  activeBoardId: string | null;
  onSwitch: (board: Board) => void;
  onSaveBeforeSwitch: () => Promise<void>;
}

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
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const newBoardRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (creatingBoard) setTimeout(() => newBoardRef.current?.focus(), 30);
  }, [creatingBoard]);

  useEffect(() => {
    if (creatingFolder) setTimeout(() => newFolderRef.current?.focus(), 30);
  }, [creatingFolder]);

  // close context/move menus on outside click
  useEffect(() => {
    if (!contextMenu && !moveMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setMoveMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu, moveMenu]);

  const handleSwitch = async (board: Board) => {
    if (board.id === activeBoardId) return;
    await onSaveBeforeSwitch();
    onSwitch(board);
  };

  // ── Create board (no folder input — goes to root) ─────────────────────────
  const commitCreateBoard = async () => {
    const name = newBoardName.trim() || "Untitled";
    await BoardStorage.createBoard(name, "");
    setCreatingBoard(false);
    setNewBoardName("");
    await reload(); // stay on current board
  };

  // ── Create folder ─────────────────────────────────────────────────────────
  const commitCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) { setCreatingFolder(false); setNewFolderName(""); return; }
    // folder only exists when it has boards — create an "Untitled" board inside it
    await BoardStorage.createBoard("Untitled", name);
    setOpenFolders((prev) => new Set([...prev, name]));
    setCreatingFolder(false);
    setNewFolderName("");
    await reload(); // stay on current board
  };

  // ── Context menu ──────────────────────────────────────────────────────────
  const openContextMenu = (e: React.MouseEvent, board: Board) => {
    e.preventDefault();
    e.stopPropagation();
    setMoveMenu(null);
    setDeleteConfirmId(null);
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
    ) as string[];
    setMoveMenu({ board, folders: existingFolders });
  };

  const commitMove = async (board: Board, folder: string) => {
    await BoardStorage.save({ ...board, folder, updatedAt: Date.now() });
    if (folder) setOpenFolders((prev) => new Set([...prev, folder]));
    setMoveMenu(null);
    await reload();
  };

  // ── Delete (inline confirm) ───────────────────────────────────────────────
  const handleDelete = (board: Board) => {
    setContextMenu(null);
    setDeleteConfirmId(board.id);
  };

  const confirmDelete = async (board: Board) => {
    setDeleteConfirmId(null);
    await BoardStorage.delete(board.id);
    const remaining = boards.filter((b) => b.id !== board.id);
    if (board.id === activeBoardId && remaining.length > 0) {
      await onSaveBeforeSwitch();
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

  // ── Drag and drop ─────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, board: Board) => {
    setDragId(board.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folder: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folder);
  };

  const handleDrop = async (e: React.DragEvent, folder: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    if (!dragId) return;
    const board = boards.find((b) => b.id === dragId);
    if (!board || board.folder === folder) { setDragId(null); return; }
    await BoardStorage.save({ ...board, folder, updatedAt: Date.now() });
    if (folder) setOpenFolders((prev) => new Set([...prev, folder]));
    setDragId(null);
    await reload();
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverFolder(null);
  };

  // ── Context menu position ─────────────────────────────────────────────────
  const getMenuStyle = (): React.CSSProperties => {
    if (!contextMenu || !sidebarRef.current) return {};
    const anchor = contextMenu.anchorEl.getBoundingClientRect();
    const sidebar = sidebarRef.current.getBoundingClientRect();
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

  const renderItem = (board: Board) => {
    if (deleteConfirmId === board.id) {
      return (
        <div key={board.id} className="boards-sidebar__item boards-sidebar__item--confirm">
          <span className="boards-sidebar__item-name">Delete "{board.name}"?</span>
          <button className="boards-sidebar__confirm-yes" onClick={() => confirmDelete(board)}>
            Delete
          </button>
          <button className="boards-sidebar__confirm-no" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div
        key={board.id}
        className={[
          "boards-sidebar__item",
          board.id === activeBoardId ? "is-active" : "",
          dragId === board.id ? "is-dragging" : "",
        ].filter(Boolean).join(" ")}
        draggable
        onDragStart={(e) => handleDragStart(e, board)}
        onDragEnd={handleDragEnd}
        onClick={() => handleSwitch(board)}
        onContextMenu={(e) => openContextMenu(e, board)}
      >
        <svg className="boards-sidebar__item-icon" width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1"/>
          <line x1="2" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="1"/>
          <line x1="2" y1="6.5" x2="8" y2="6.5" stroke="currentColor" strokeWidth="1"/>
          <line x1="2" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1"/>
        </svg>
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
  };

  return (
    <div className="boards-sidebar" ref={sidebarRef}>
      {/* Header */}
      <div className="boards-sidebar__header">
        <span>Boards</span>
        <div className="boards-sidebar__header-actions">
          <button
            className="boards-sidebar__new-btn"
            onClick={() => { setCreatingBoard(true); setCreatingFolder(false); }}
            title="New board"
          >
            + Board
          </button>
          <button
            className="boards-sidebar__new-btn boards-sidebar__new-btn--folder"
            onClick={() => { setCreatingFolder(true); setCreatingBoard(false); }}
            title="New folder"
          >
            + Folder
          </button>
        </div>
      </div>

      {/* Inline new board form */}
      {creatingBoard && (
        <div className="boards-sidebar__create-form">
          <input
            ref={newBoardRef}
            className="boards-sidebar__create-input"
            placeholder="Board name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreateBoard();
              if (e.key === "Escape") { setCreatingBoard(false); setNewBoardName(""); }
              e.stopPropagation();
            }}
          />
          <div className="boards-sidebar__create-actions">
            <button className="boards-sidebar__create-confirm" onClick={commitCreateBoard}>
              Create
            </button>
            <button className="boards-sidebar__create-cancel" onClick={() => { setCreatingBoard(false); setNewBoardName(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline new folder form */}
      {creatingFolder && (
        <div className="boards-sidebar__create-form">
          <input
            ref={newFolderRef}
            className="boards-sidebar__create-input"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreateFolder();
              if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
              e.stopPropagation();
            }}
          />
          <div className="boards-sidebar__create-actions">
            <button className="boards-sidebar__create-confirm" onClick={commitCreateFolder}>
              Create
            </button>
            <button className="boards-sidebar__create-cancel" onClick={() => { setCreatingFolder(false); setNewFolderName(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Board list */}
      <div
        className={`boards-sidebar__scroll${dragOverFolder === "" ? " is-drop-target" : ""}`}
        onDragOver={(e) => handleDragOver(e, "")}
        onDrop={(e) => handleDrop(e, "")}
      >
        {boards.length === 0 && !creatingBoard && !creatingFolder && (
          <div className="boards-sidebar__empty">
            No boards yet.
            <br />
            Click <strong>+ Board</strong> to create one.
          </div>
        )}

        {/* Folders */}
        {folders.map((folder) => {
          const items = boards.filter((b) => b.folder === folder);
          const isOpen = openFolders.has(folder);
          const isDropTarget = dragOverFolder === folder;
          return (
            <div
              key={folder}
              className={`boards-sidebar__folder${isDropTarget ? " is-drop-target" : ""}`}
              onDragOver={(e) => handleDragOver(e, folder)}
              onDrop={(e) => handleDrop(e, folder)}
            >
              <div
                className={`boards-sidebar__folder-header${isOpen ? " is-open" : ""}`}
                onClick={() => toggleFolder(folder)}
              >
                <svg viewBox="0 0 6 10" fill="currentColor" className="boards-sidebar__folder-chevron">
                  <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="boards-sidebar__folder-icon">
                  <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5l1.5 1.5H10.5C11.33 3.5 12 4.17 12 5v5c0 .83-.67 1.5-1.5 1.5h-8C1.67 11.5 1 10.83 1 10V3.5z" stroke="currentColor" strokeWidth="1" fill="none"/>
                </svg>
                <span>{folder}</span>
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
          style={getMenuStyle()}
        >
          <button onClick={() => handleRename(contextMenu.board)}>Rename</button>
          <button onClick={() => handleMoveFolder(contextMenu.board)}>Move to folder</button>
          <button className="danger" onClick={() => handleDelete(contextMenu.board)}>Delete</button>
        </div>
      )}

      {/* Move to folder picker */}
      {moveMenu && (
        <div
          ref={moveMenuRef}
          className="boards-sidebar__context-menu boards-sidebar__move-menu"
          style={getMoveMenuStyle()}
        >
          <div className="boards-sidebar__move-label">Move to folder</div>
          <button onClick={() => commitMove(moveMenu.board, "")}>📄 Root (no folder)</button>
          {moveMenu.folders.map((f) => (
            <button key={f} onClick={() => commitMove(moveMenu.board, f)}>📁 {f}</button>
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
