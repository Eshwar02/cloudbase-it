import { render, screen } from "@testing-library/react";
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
