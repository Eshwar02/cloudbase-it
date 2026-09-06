import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NameModal } from "./NameModal";

test("submits a trimmed name and disables when empty", async () => {
  const onSubmit = vi.fn();
  render(<NameModal open title="New folder" confirmLabel="Create" onSubmit={onSubmit} onClose={() => {}} />);

  const create = screen.getByRole("button", { name: "Create" });
  expect(create).toBeDisabled();

  await userEvent.type(screen.getByLabelText("Name"), "  Reports  ");
  expect(create).toBeEnabled();
  await userEvent.click(create);
  expect(onSubmit).toHaveBeenCalledWith("Reports");
});

test("submits on Enter", async () => {
  const onSubmit = vi.fn();
  render(<NameModal open title="New folder" onSubmit={onSubmit} onClose={() => {}} />);
  await userEvent.type(screen.getByLabelText("Name"), "Docs{Enter}");
  expect(onSubmit).toHaveBeenCalledWith("Docs");
});
