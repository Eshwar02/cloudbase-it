import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { DriveActionsProvider } from "../../hooks/useDriveActions";
import { SettingsProvider } from "../../hooks/useSettings";

export function AppLayout() {
  return (
    <SettingsProvider>
      <DriveActionsProvider>
        <div className="flex h-full bg-g-rail dark:bg-[#1f1f1f]">
          <Sidebar />
          <main className="m-2 ml-0 flex-1 overflow-auto rounded-2xl bg-white dark:bg-[#131314]">
            <Outlet />
          </main>
        </div>
      </DriveActionsProvider>
    </SettingsProvider>
  );
}
