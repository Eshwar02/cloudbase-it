import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RenameModal } from "./RenameModal";

test("edits name and submits", async () => {
  const onSubmit = vi.fn();
  render(<RenameModal open initialName="old" onSubmit={onSubmit} onClose={() => {}} />);
  const input = screen.getByLabelText("New name");
  await userEvent.clear(input);
  await userEvent.type(input, "new");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).toHaveBeenCalledWith("new");
});

test("syncs the input when initialName changes on reopen", async () => {
  const { rerender } = render(
    <RenameModal open initialName="first.txt" onSubmit={() => {}} onClose={() => {}} />,
  );
  expect(screen.getByLabelText("New name")).toHaveValue("first.txt");
  rerender(<RenameModal open initialName="second.txt" onSubmit={() => {}} onClose={() => {}} />);
  await waitFor(() => expect(screen.getByLabelText("New name")).toHaveValue("second.txt"));
});
