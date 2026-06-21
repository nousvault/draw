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
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="1" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
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
