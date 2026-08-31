import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import PublicPage from "./PublicPage";

function renderAt(token: string) {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/public/${token}`]}>
        <Routes><Route path="/public/:token" element={<PublicPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("shows file download for an open link", async () => {
  server.use(http.get("/api/public/tok1", () => HttpResponse.json({
    item_type: "file", name: "report.pdf", role: "viewer",
    mime_type: "application/pdf", size_bytes: 10,
    download_url: "https://storage.local/download/report.pdf" })));
  renderAt("tok1");
  await waitFor(() => expect(screen.getByText(/report.pdf/)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
});

test("prompts for password then unlocks", async () => {
  let unlocked = false;
  server.use(http.get("/api/public/tok2", ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("password") === "secret") {
      unlocked = true;
      return HttpResponse.json({ item_type: "file", name: "locked.txt",
        role: "viewer", mime_type: "text/plain", size_bytes: 4,
        download_url: "https://storage.local/download/locked.txt" });
    }
    return new HttpResponse(null, { status: 401 });
  }));
  const user = userEvent.setup();
  renderAt("tok2");
  await waitFor(() =>
    expect(screen.getByLabelText("Password")).toBeInTheDocument());
  await user.type(screen.getByLabelText("Password"), "secret");
  await user.click(screen.getByRole("button", { name: "Unlock" }));
  await waitFor(() => expect(screen.getByText(/locked.txt/)).toBeInTheDocument());
  expect(unlocked).toBe(true);
});
