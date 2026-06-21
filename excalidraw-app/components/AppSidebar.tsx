import React from "react";
import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { Board } from "../data/BoardStorage";
import { BoardsSidebar } from "./BoardsSidebar";

interface Props {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  activeBoardId: string | null;
  onSwitch: (board: Board) => void;
  onSaveBeforeSwitch: () => Promise<void>;
}

export const AppSidebar: React.FC<Props> = ({
  activeBoardId,
  onSwitch,
  onSaveBeforeSwitch,
}) => {
  return (
    <DefaultSidebar>
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
