import {
  Excalidraw,
  CaptureUpdateAction,
  useEditorInterface,
  ExcalidrawAPIProvider,
  useExcalidrawAPI,
} from "@excalidraw/excalidraw";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@excalidraw/excalidraw/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@excalidraw/excalidraw/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import {
  APP_NAME,
  EVENT,
  VERSION_TIMEOUT,
  debounce,
  getVersion,
  getFrame,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  isDevEnv,
} from "@excalidraw/common";
import polyfill from "@excalidraw/excalidraw/polyfill";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { t } from "@excalidraw/excalidraw/i18n";

import {
  GithubIcon,
  XBrandIcon,
} from "@excalidraw/excalidraw/components/icons";
import { isElementLink } from "@excalidraw/element";
import {
  restoreAppState,
  restoreElements,
} from "@excalidraw/excalidraw/data/restore";
import { newElementWith } from "@excalidraw/element";
import { isInitializedImageElement } from "@excalidraw/element";
import clsx from "clsx";
import {
  parseLibraryTokensFromUrl,
  useHandleLibrary,
} from "@excalidraw/excalidraw/data/library";

import type { RestoredDataState } from "@excalidraw/excalidraw/data/restore";
import type {
  FileId,
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
  ExcalidrawInitialDataState,
  UIAppState,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import type { ResolvablePromise } from "@excalidraw/common/utils";

import CustomStats from "./CustomStats";
import {
  Provider,
  useAtomValue,
  appJotaiStore,
} from "./app-jotai";
import {
  STORAGE_KEYS,
  SYNC_BROWSER_TABS_TIMEOUT,
} from "./app_constants";
import { AppFooter } from "./components/AppFooter";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import { AppSidebar } from "./components/AppSidebar";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import { updateStaleImageStatuses } from "./data/FileManager";
import { FileStatusStore } from "./data/fileStatusStore";
import {
  importFromLocalStorage,
  importUsernameFromLocalStorage,
} from "./data/localStorage";

import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
  localStorageQuotaExceededAtom,
} from "./data/LocalData";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import { useHandleAppTheme } from "./useHandleAppTheme";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
  loadSavedDebugState,
} from "./components/DebugCanvas";
import { BoardStorage, type Board } from "./data/BoardStorage";

import "./index.scss";

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;

window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    event.preventDefault();
    pwaEvent = event;
  },
);

let isSelfEmbedding = false;

if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const initializeScene = async (opts: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  board: Board | null;
}): Promise<{ scene: ExcalidrawInitialDataState | null }> => {
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  // If loading from a board, use its stored data
  if (opts.board) {
    try {
      const elements = restoreElements(
        JSON.parse(opts.board.elements || "[]"),
        null,
        { repairBindings: true, deleteInvisibleElements: true },
      );
      const appState = restoreAppState(
        JSON.parse(opts.board.appState || "{}"),
        null,
      );
      return { scene: { elements, appState: { ...appState, openSidebar: { name: "default", tab: "boards" } } } };
    } catch {
      return { scene: null };
    }
  }

  const localDataState = importFromLocalStorage();

  const scene: Omit<RestoredDataState, "files"> & {
    scrollToContent?: boolean;
  } = {
    elements: restoreElements(localDataState?.elements, null, {
      repairBindings: true,
      deleteInvisibleElements: true,
    }),
    appState: restoreAppState(localDataState?.appState, null),
  };

  if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);
    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      return { scene: data };
    } catch (error: any) {
      return {
        scene: {
          appState: { errorMessage: t("alerts.invalidSceneUrl") },
        },
      };
    }
  }

  return { scene };
};

// Debounced board save — 1s after last change
const debouncedSaveBoard = debounce(
  async (
    board: Board,
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    try {
      await BoardStorage.save({
        ...board,
        elements: JSON.stringify(elements),
        appState: JSON.stringify({
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          theme: appState.theme,
          viewBackgroundColor: appState.viewBackgroundColor,
        }),
        files: JSON.stringify(
          Object.fromEntries(
            Object.entries(files).map(([k, v]) => [k, v]),
          ),
        ),
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn("Board save failed", e);
    }
  },
  1000,
);

const ExcalidrawWrapper = () => {
  const excalidrawAPI = useExcalidrawAPI();

  const [errorMessage, setErrorMessage] = useState("");
  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();
  const [langCode, setLangCode] = useAppLangCode();
  const editorInterface = useEditorInterface();

  // Board state
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const activeBoardRef = useRef<Board | null>(null);

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ExcalidrawInitialDataState | null>();
  }

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useHandleLibrary({
    excalidrawAPI,
    adapter: LibraryIndexedDBAdapter,
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (isDevEnv()) {
      const debugState = loadSavedDebugState();
      if (debugState.enabled && !window.visualDebug) {
        window.visualDebug = { data: [] };
      } else {
        delete window.visualDebug;
      }
      forceRefresh((prev) => !prev);
    }
  }, [excalidrawAPI]);

  // ── Board initialization ────────────────────────────────────────────────────
  useEffect(() => {
    if (!excalidrawAPI) return;

    (async () => {
      let boards = await BoardStorage.getAll();
      let activeId = BoardStorage.getActiveId();
      let activeBoard: Board | null = null;

      if (boards.length === 0) {
        // First ever load — migrate localStorage into a board
        const migrated = await BoardStorage.migrateFromLocalStorage();
        if (migrated) {
          boards = [migrated];
          activeId = migrated.id;
          BoardStorage.setActiveId(migrated.id);
        }
      }

      activeBoard = boards.find((b) => b.id === activeId) ?? boards[0] ?? null;

      if (activeBoard) {
        BoardStorage.setActiveId(activeBoard.id);
        activeBoardRef.current = activeBoard;
        setActiveBoardId(activeBoard.id);
      }

      const { scene } = await initializeScene({
        excalidrawAPI,
        board: activeBoard,
      });
      initialStatePromiseRef.current.promise.resolve(scene);

      // load files for active board
      if (activeBoard) {
        try {
          const files = JSON.parse(activeBoard.files || "{}");
          if (Object.keys(files).length) {
            excalidrawAPI.addFiles(Object.values(files));
          }
        } catch {}
      }
    })();
  }, [excalidrawAPI]);

  // ── Tab sync (multi-tab localStorage) ──────────────────────────────────────
  useEffect(() => {
    if (!excalidrawAPI) return;

    const syncData = debounce(() => {
      if (isTestEnv() || document.hidden) return;
      if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
        setLangCode(getPreferredLanguage());
        const fileIds =
          excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .reduce((acc, element) => {
              if (isInitializedImageElement(element)) {
                return acc.concat(element.fileId);
              }
              return acc;
            }, [] as FileId[]) || [];

        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
          const currFiles = excalidrawAPI.getFiles();
          const missing = fileIds.filter((id) => !currFiles[id]);
          if (missing.length) {
            LocalData.fileStorage
              .getFiles(missing)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) excalidrawAPI.addFiles(loadedFiles);
                updateStaleImageStatuses({
                  excalidrawAPI,
                  erroredFiles,
                  elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
        }
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    const onUnload = () => LocalData.flushSave();
    const visibilityChange = (event: FocusEvent | Event) => {
      if (event.type === EVENT.BLUR || document.hidden) LocalData.flushSave();
      if (event.type === EVENT.VISIBILITY_CHANGE || event.type === EVENT.FOCUS) syncData();
    };

    const onHashChange = async (event: HashChangeEvent) => {
      event.preventDefault();
      const libraryUrlTokens = parseLibraryTokensFromUrl();
      if (!libraryUrlTokens) {
        excalidrawAPI.updateScene({ appState: { isLoading: true } });
        const { scene } = await initializeScene({
          excalidrawAPI,
          board: activeBoardRef.current,
        });
        if (scene) {
          excalidrawAPI.updateScene({
            elements: restoreElements(scene.elements, null, { repairBindings: true }),
            appState: restoreAppState(scene.appState, null),
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
        }
      }
    };

    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onUnload, false);
    window.addEventListener(EVENT.BLUR, visibilityChange, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    window.addEventListener(EVENT.FOCUS, visibilityChange, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onUnload, false);
      window.removeEventListener(EVENT.BLUR, visibilityChange, false);
      window.removeEventListener(EVENT.FOCUS, visibilityChange, false);
      document.removeEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    };
  }, [excalidrawAPI, setLangCode]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      LocalData.flushSave();
      if (
        excalidrawAPI &&
        LocalData.fileStorage.shouldPreventUnload(excalidrawAPI.getSceneElements())
      ) {
        if (import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true") {
          preventUnload(event);
        }
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
  }, [excalidrawAPI]);

  // ── onChange: save to LocalData + board ────────────────────────────────────
  const onChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    // Always keep LocalData in sync (for tab sync / fallback)
    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;
          const updated = excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (LocalData.fileStorage.shouldUpdateImageElementStatus(element)) {
                const newElement = newElementWith(element, { status: "saved" });
                if (newElement !== element) didChange = true;
                return newElement;
              }
              return element;
            });
          if (didChange) {
            excalidrawAPI.updateScene({
              elements: updated,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    // Save to active board in IndexedDB
    if (activeBoardRef.current) {
      debouncedSaveBoard(activeBoardRef.current, elements, appState, files);
    }

    if (debugCanvasRef.current && excalidrawAPI) {
      debugRenderer(debugCanvasRef.current, appState, elements, window.devicePixelRatio);
    }
  };

  // ── Board switch ────────────────────────────────────────────────────────────
  const handleSaveBeforeSwitch = useCallback(async () => {
    if (!excalidrawAPI || !activeBoardRef.current) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();
    await BoardStorage.save({
      ...activeBoardRef.current,
      elements: JSON.stringify(elements),
      appState: JSON.stringify({
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        theme: appState.theme,
        viewBackgroundColor: appState.viewBackgroundColor,
      }),
      files: JSON.stringify(files),
      updatedAt: Date.now(),
    });
  }, [excalidrawAPI]);

  const handleBoardSwitch = useCallback(
    async (board: Board) => {
      if (!excalidrawAPI) return;
      activeBoardRef.current = board;
      setActiveBoardId(board.id);
      BoardStorage.setActiveId(board.id);

      try {
        const elements = restoreElements(
          JSON.parse(board.elements || "[]"),
          null,
          { repairBindings: true, deleteInvisibleElements: true },
        );
        const appState = restoreAppState(
          JSON.parse(board.appState || "{}"),
          null,
        );
        excalidrawAPI.updateScene({
          elements,
          appState: { ...appState, isLoading: false },
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });

        // load files
        try {
          const files = JSON.parse(board.files || "{}");
          if (Object.keys(files).length) {
            excalidrawAPI.addFiles(Object.values(files));
          }
        } catch {}
      } catch (e) {
        console.warn("Board load failed", e);
      }
    },
    [excalidrawAPI],
  );

  // ── Misc ────────────────────────────────────────────────────────────────────
  const renderCustomStats = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: UIAppState,
  ) => (
    <CustomStats
      setToast={(message) => excalidrawAPI!.setToast({ message })}
      appState={appState}
      elements={elements}
    />
  );

  const localStorageQuotaExceeded = useAtomValue(localStorageQuotaExceededAtom);

  const onExport: Required<ExcalidrawProps>["onExport"] = useCallback(
    async function* () {
      let snapshot = FileStatusStore.getSnapshot();
      const { pending, total } = FileStatusStore.getPendingCount(snapshot.value);
      if (pending === 0) return;

      yield { type: "progress", progress: (total - pending) / total, message: `Loading images (${total - pending}/${total})...` };

      while (true) {
        snapshot = await FileStatusStore.pull(snapshot.version);
        const { pending: nowPending, total: nowTotal } = FileStatusStore.getPendingCount(snapshot.value);
        yield { type: "progress", progress: (nowTotal - nowPending) / nowTotal, message: `Loading images (${nowTotal - nowPending}/${nowTotal})...` };
        if (nowPending === 0) {
          await new Promise((r) => setTimeout(r, 500));
          yield { type: "progress", message: `Preparing export...` };
          return;
        }
      }
    },
    [],
  );

  if (isSelfEmbedding) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", height: "100%" }}>
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  return (
    <div style={{ height: "100%" }} className={clsx("excalidraw-app")}>
      <Excalidraw
        onChange={onChange}
        onExport={onExport}
        initialData={initialStatePromiseRef.current.promise}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {},
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        onThemeChange={setAppTheme}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            excalidrawAPI?.scrollToContent(element.link, { animate: true });
          }
        }}
      >
        <AppMainMenu
          theme={appTheme}
          refresh={() => forceRefresh((prev) => !prev)}
          onOpenBoards={() => {
            excalidrawAPI?.updateScene({
              appState: { openSidebar: { name: "default", tab: "boards" } },
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }}
        />
        <AppWelcomeScreen
          onOpenBoards={() => {
            excalidrawAPI?.updateScene({
              appState: { openSidebar: { name: "default", tab: "boards" } },
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }}
        />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
        </OverwriteConfirmDialog>
        <AppFooter onChange={() => excalidrawAPI?.refresh()} />

        <AppSidebar
          excalidrawAPI={excalidrawAPI}
          activeBoardId={activeBoardId}
          onSwitch={handleBoardSwitch}
          onSaveBeforeSwitch={handleSaveBeforeSwitch}
        />

        {localStorageQuotaExceeded && (
          <div className="alert alert--danger">
            {t("alerts.localStorageQuotaExceeded")}
          </div>
        )}

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: "GitHub",
              icon: GithubIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["issues", "bugs", "requests", "report"],
              perform: () => {
                window.open("https://github.com/nousvault/draw", "_blank", "noopener noreferrer");
              },
            },
            {
              label: t("labels.followUs"),
              icon: XBrandIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["twitter", "contact", "social"],
              perform: () => {
                window.open("https://x.com/TofuuTalks", "_blank", "noopener noreferrer");
              },
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => { pwaEvent = null; });
                }
              },
            },
          ]}
        />
        {isVisualDebuggerEnabled() && excalidrawAPI && (
          <DebugCanvas
            appState={excalidrawAPI.getAppState()}
            scale={window.devicePixelRatio}
            ref={debugCanvasRef}
          />
        )}
      </Excalidraw>
    </div>
  );
};

const ExcalidrawApp = () => {
  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        <ExcalidrawAPIProvider>
          <ExcalidrawWrapper />
        </ExcalidrawAPIProvider>
      </Provider>
    </TopErrorBoundary>
  );
};

export default ExcalidrawApp;
