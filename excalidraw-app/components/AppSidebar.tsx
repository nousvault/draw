import React, { useRef } from "react";
import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { Board } from "../data/BoardStorage";
import { BoardsSidebar } from "./BoardsSidebar";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";

interface Props {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  activeBoardId: string | null;
  onSwitch: (board: Board) => void;
  onSaveBeforeSwitch: () => Promise<void>;
  lastSidebarTabRef: React.MutableRefObject<string>;
}

export const AppSidebar: React.FC<Props> = ({
  excalidrawAPI,
  activeBoardId,
  onSwitch,
  onSaveBeforeSwitch,
  lastSidebarTabRef,
}) => {
  // Track whether sidebar was closed so we know when it's a fresh open
  const wasClosedRef = useRef(true);

  const handleStateChange = (
    state: { name: string; tab?: string } | null,
  ) => {
    if (!state) {
      // Sidebar is closing — mark as closed
      wasClosedRef.current = true;
      return;
    }

    if (wasClosedRef.current) {
      // Fresh open — restore last known tab if different from what it opened with
      wasClosedRef.current = false;
      const targetTab = lastSidebarTabRef.current;
      if (state.tab !== targetTab) {
        excalidrawAPI?.updateScene({
          appState: {
            openSidebar: { name: "default", tab: targetTab },
          },
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      }
    } else {
      // User switched tab — remember it
      if (state.tab) {
        lastSidebarTabRef.current = state.tab;
      }
    }
  };

  return (
    <DefaultSidebar onStateChange={handleStateChange}>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger tab="boards" title="Boards">
          {/* Folder icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1.5 4C1.5 3.17 2.17 2.5 3 2.5H6L7.5 4H13C13.83 4 14.5 4.67 14.5 5.5V12C14.5 12.83 13.83 13.5 13 13.5H3C2.17 13.5 1.5 12.83 1.5 12V4Z"
              stroke="currentColor"
              strokeWidth="1.3"
              fill="none"
            />
          </svg>
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="boards">
        <BoardsSidebar
          activeBoardId={activeBoardId}
          onSwitch={onSwitch}
          onSaveBeforeSwitch={onSaveBeforeSwitch}
        />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
