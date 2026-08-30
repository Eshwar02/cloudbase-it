import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

test("confirm and cancel fire the right callbacks", async () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<ConfirmDialog open title="Delete?" message="Sure?" confirmLabel="Delete"
    onConfirm={onConfirm} onClose={onClose} />);
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(onConfirm).toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalled();
});
