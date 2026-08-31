import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient";
import { server } from "../../test/server";
import { ToastProvider } from "../ui/Toast";
import { ShareModal } from "./ShareModal";

function renderModal() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ShareModal target={{ kind: "file", id: "x1", name: "note.txt" }}
          onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

test("adds a share by email", async () => {
  server.use(
    http.get("/api/shares", () => HttpResponse.json([])),
    http.post("/api/shares", () => HttpResponse.json({
      id: "s1", file_id: "x1", folder_id: null, grantee_user_id: "u2",
      grantee_email: "bob@example.com", role: "viewer", created_at: "" })),
  );
  const user = userEvent.setup();
  renderModal();

  await user.type(screen.getByLabelText("Grantee email"), "bob@example.com");

  // After posting, listShares is called again — return the new grant then.
  server.use(http.get("/api/shares", () => HttpResponse.json([{
    id: "s1", file_id: "x1", folder_id: null, grantee_user_id: "u2",
    grantee_email: "bob@example.com", role: "viewer", created_at: "" }])));

  await user.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() =>
    expect(screen.getByText(/bob@example.com/)).toBeInTheDocument());
});

test("creates a public link and shows the url", async () => {
  server.use(
    http.get("/api/shares", () => HttpResponse.json([])),
    http.post("/api/public-link", () => HttpResponse.json({
      id: "l1", token: "abc123", url: "/public/abc123", role: "viewer",
      has_password: false, expires_at: null, created_at: "" })),
  );
  const user = userEvent.setup();
  renderModal();

  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    const input = screen.getByLabelText("Public link URL") as HTMLInputElement;
    expect(input.value).toContain("/public/abc123");
  });
});
