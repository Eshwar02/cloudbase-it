import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import TrashPage from "./TrashPage";

function renderTrash() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}><TrashPage /></QueryClientProvider>,
  );
}

test("lists trashed items and restores one", async () => {
  let restored = false;
  server.use(
    http.get("/api/trash", () => HttpResponse.json([
      { id: "t1", item_type: "file", name: "old.txt", trashed_at: null },
    ])),
    http.post("/api/trash/file/t1/restore", () => { restored = true; return HttpResponse.json({ status: "restored" }); }),
  );
  renderTrash();
  await waitFor(() => expect(screen.getByText(/old.txt/)).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name: "Restore" }));
  await waitFor(() => expect(restored).toBe(true));
});
