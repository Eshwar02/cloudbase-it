import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient";
import { server } from "../../test/server";
import { ToastProvider } from "../ui/Toast";
import { OrganizeModal } from "./OrganizeModal";

function renderModal(onApplied = () => {}) {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <OrganizeModal open folderId="f1" onClose={() => {}} onApplied={onApplied} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

test("shows proposed groups and applies them", async () => {
  server.use(
    http.post("/api/ai/organize/f1", () =>
      HttpResponse.json({ groups: [
        { name: "Invoices", file_ids: ["a", "b"], folder_ids: [] },
      ] })),
    http.post("/api/ai/organize/f1/apply", () =>
      HttpResponse.json({ created_folders: [{ id: "n1", name: "Invoices" }], moved: 2 })),
  );
  const onApplied = vi.fn();
  const user = userEvent.setup();
  renderModal(onApplied);

  await waitFor(() =>
    expect(screen.getByText("📁 Invoices")).toBeInTheDocument());

  await user.click(screen.getByRole("button", { name: "Apply" }));
  await waitFor(() => expect(onApplied).toHaveBeenCalled());
});

test("shows a friendly message when AI is not configured", async () => {
  server.use(
    http.post("/api/ai/organize/f1", () =>
      HttpResponse.json({ detail: "ai_unavailable" }, { status: 503 })),
  );
  renderModal();
  await waitFor(() =>
    expect(screen.getByText(/not configured/i)).toBeInTheDocument());
});
