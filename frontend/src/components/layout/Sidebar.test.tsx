import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { queryClient } from "../../lib/queryClient";
import { Sidebar } from "./Sidebar";

test("shows nav links and logout", () => {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Sidebar /></MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.getByText("My Drive")).toBeInTheDocument();
  expect(screen.getByText("Trash")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
});
