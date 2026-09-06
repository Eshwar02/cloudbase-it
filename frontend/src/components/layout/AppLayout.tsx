import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { DriveActionsProvider } from "../../hooks/useDriveActions";

export function AppLayout() {
  return (
    <DriveActionsProvider>
      <div className="flex h-full bg-g-rail">
        <Sidebar />
        <main className="m-2 ml-0 flex-1 overflow-auto rounded-2xl bg-white">
          <Outlet />
        </main>
      </div>
    </DriveActionsProvider>
  );
}
