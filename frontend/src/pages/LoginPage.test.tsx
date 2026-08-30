import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import LoginPage from "./LoginPage";

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><LoginPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

test("successful login sets character to 'yes'", async () => {
  server.use(http.post("/api/auth/login", () =>
    HttpResponse.json({ id: "u1", email: "a@b.com", display_name: "A", storage_used_bytes: 0, storage_quota_bytes: 1 })));
  renderPage();
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Password"), "pw");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  await waitFor(() => expect(screen.getByTestId("lottie-character")).toHaveAttribute("data-state", "yes"));
});

test("failed login sets character to 'no' and shows error", async () => {
  server.use(http.post("/api/auth/login", () => new HttpResponse(null, { status: 401 })));
  renderPage();
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Password"), "bad");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  await waitFor(() => expect(screen.getByTestId("lottie-character")).toHaveAttribute("data-state", "no"));
  expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
});
