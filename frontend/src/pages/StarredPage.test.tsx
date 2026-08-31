import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import StarredPage from "./StarredPage";
import { ToastProvider } from "../components/ui/Toast";

test("lists starred items", async () => {
  queryClient.clear();
  server.use(http.get("/api/stars", () => HttpResponse.json([
    { id: "f1", item_type: "folder", name: "Favourites" },
    { id: "x1", item_type: "file", name: "pinned.txt", mime_type: "text/plain", size_bytes: 5 },
  ])));
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter><StarredPage /></MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText(/Favourites/)).toBeInTheDocument());
  expect(screen.getByText(/pinned.txt/)).toBeInTheDocument();
});
