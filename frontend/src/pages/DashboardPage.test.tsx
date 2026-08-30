import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import DashboardPage from "./DashboardPage";
import { ToastProvider } from "../components/ui/Toast";

function renderDash() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

test("root shows drive folders and files", async () => {
  server.use(http.get("/api/drive", () => HttpResponse.json({
    folders: [{ id: "f1", owner_id: "u1", parent_id: null, name: "Docs", is_trashed: false, created_at: "" }],
    files: [{ id: "x1", name: "note.txt", size_bytes: 3, mime_type: "text/plain" }],
  })));
  renderDash();
  await waitFor(() => expect(screen.getByText(/Docs/)).toBeInTheDocument());
  expect(screen.getByText(/note.txt/)).toBeInTheDocument();
});
