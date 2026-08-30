import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { server } from "../test/server";
import RegisterPage from "./RegisterPage";

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><RegisterPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

test("duplicate email shows 'no' state and 409 message", async () => {
  server.use(http.post("/api/auth/register", () => new HttpResponse(null, { status: 409 })));
  renderPage();
  await userEvent.type(screen.getByLabelText("Name"), "A");
  await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
  await userEvent.type(screen.getByLabelText("Password"), "pw");
  await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
  await waitFor(() => expect(screen.getByTestId("lottie-character")).toHaveAttribute("data-state", "no"));
  expect(screen.getByRole("alert")).toHaveTextContent(/already registered/i);
});
