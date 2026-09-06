import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const { notify } = useToast();
  return (
    <button onClick={() => notify("Moved to trash", "info", { actionLabel: "Undo", onAction: () => notify("Undone", "success") })}>
      del
    </button>
  );
}

test("shows an Undo action and fires it", async () => {
  render(<ToastProvider><Trigger /></ToastProvider>);
  await userEvent.click(screen.getByRole("button", { name: "del" }));
  expect(screen.getByText("Moved to trash")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByText("Undone")).toBeInTheDocument();
});
