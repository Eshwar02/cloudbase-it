import { createContext, useContext, useRef, type ReactNode } from "react";

/**
 * Bridges the sidebar's global "New" button to the page that owns the
 * current-folder context. DashboardPage registers folder-aware handlers on
 * mount; other pages fall back to the no-op defaults (New simply does nothing
 * where there's nothing to create in).
 */
export interface DriveActionHandlers {
  newFolder: () => void;
  uploadFiles: (files: File[]) => void;
}

interface DriveActionsContextValue {
  register: (h: DriveActionHandlers) => void;
  unregister: () => void;
  newFolder: () => void;
  uploadFiles: (files: File[]) => void;
}

const noop = () => {};
const DriveActionsContext = createContext<DriveActionsContextValue>({
  register: noop,
  unregister: noop,
  newFolder: noop,
  uploadFiles: noop,
});

export function DriveActionsProvider({ children }: { children: ReactNode }) {
  const handlers = useRef<DriveActionHandlers | null>(null);
  const value: DriveActionsContextValue = {
    register: (h) => {
      handlers.current = h;
    },
    unregister: () => {
      handlers.current = null;
    },
    newFolder: () => handlers.current?.newFolder(),
    uploadFiles: (files) => handlers.current?.uploadFiles(files),
  };
  return <DriveActionsContext.Provider value={value}>{children}</DriveActionsContext.Provider>;
}

export function useDriveActions() {
  return useContext(DriveActionsContext);
}
