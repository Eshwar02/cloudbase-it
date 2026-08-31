import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import SharedPage from "./SharedPage";
import { ToastProvider } from "../components/ui/Toast";

test("lists items shared with me", async () => {
  queryClient.clear();
  server.use(http.get("/api/shares/shared-with-me", () => HttpResponse.json([
    { id: "f1", item_type: "folder", name: "Team Docs", role: "editor", owner_email: "boss@co.com" },
    { id: "x1", item_type: "file", name: "spec.pdf", role: "viewer", owner_email: "boss@co.com" },
  ])));
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter><SharedPage /></MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText(/Team Docs/)).toBeInTheDocument());
  expect(screen.getByText(/spec.pdf/)).toBeInTheDocument();
  expect(screen.getAllByText(/boss@co.com/).length).toBeGreaterThan(0);
});
