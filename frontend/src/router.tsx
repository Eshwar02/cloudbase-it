import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TrashPage from "./pages/TrashPage";
import SearchResults from "./pages/SearchResults";
import SharedPage from "./pages/SharedPage";
import StarredPage from "./pages/StarredPage";
import PublicPage from "./pages/PublicPage";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/public/:token", element: <PublicPage /> },
  {
    path: "/",
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "folder/:id", element: <DashboardPage /> },
      { path: "shared", element: <SharedPage /> },
      { path: "starred", element: <StarredPage /> },
      { path: "trash", element: <TrashPage /> },
      { path: "search", element: <SearchResults /> },
    ],
  },
]);
