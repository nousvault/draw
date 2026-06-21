import { useI18n } from "@excalidraw/excalidraw/i18n";
import { WelcomeScreen } from "@excalidraw/excalidraw/index";
import React from "react";

interface Props {
  onOpenBoards?: () => void;
}

export const AppWelcomeScreen: React.FC<Props> = React.memo(({ onOpenBoards }) => {
  const { t } = useI18n();

  const folderIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 4C1.5 3.17 2.17 2.5 3 2.5H6L7.5 4H13C13.83 4 14.5 4.67 14.5 5.5V12C14.5 12.83 13.83 13.5 13 13.5H3C2.17 13.5 1.5 12.83 1.5 12V4Z" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );

  return (
    <WelcomeScreen>
      <WelcomeScreen.Hints.MenuHint>
        {t("welcomeScreen.app.menuHint")}
      </WelcomeScreen.Hints.MenuHint>
      <WelcomeScreen.Hints.ToolbarHint />
      <WelcomeScreen.Hints.HelpHint />
      <WelcomeScreen.Center>
        <WelcomeScreen.Center.Logo>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="10" fill="#6965d6"/>
              <path d="M10 28L16 14L22 22L26 18L30 28H10Z" fill="white" fillOpacity="0.9"/>
              <circle cx="27" cy="13" r="3" fill="white" fillOpacity="0.7"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--color-on-surface, #1e1e1e)", letterSpacing: "-0.01em" }}>
              Draw
            </span>
            <span style={{ fontSize: 11, color: "var(--color-on-surface-mid, #888)", marginTop: -2 }}>
              by NousVault · open source
            </span>
          </div>
        </WelcomeScreen.Center.Logo>
        <WelcomeScreen.Center.Heading>
          Sketch freely,{" "}
          <br />
          everything stays local.
        </WelcomeScreen.Center.Heading>
        <WelcomeScreen.Center.Menu>
          {onOpenBoards && (
            <WelcomeScreen.Center.MenuItem
              onSelect={onOpenBoards}
              icon={folderIcon}
            >
              My Boards
            </WelcomeScreen.Center.MenuItem>
          )}
          <WelcomeScreen.Center.MenuItemLoadScene />
          <WelcomeScreen.Center.MenuItemHelp />
        </WelcomeScreen.Center.Menu>
      </WelcomeScreen.Center>
    </WelcomeScreen>
  );
});
