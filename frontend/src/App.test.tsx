import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "./test/server";
import App from "./App";

test("unauthenticated user lands on login", async () => {
  server.use(http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })));
  window.history.pushState({}, "", "/");
  render(<App />);
  await waitFor(() => expect(screen.getByText("Welcome back")).toBeInTheDocument());
});
