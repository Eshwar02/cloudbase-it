import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

test("renders when open and closes on Escape", async () => {
  const onClose = vi.fn();
  render(<Modal open onClose={onClose} title="Hello"><p>Body</p></Modal>);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Body")).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

test("does not render when closed", () => {
  render(<Modal open={false} onClose={() => {}}><p>Body</p></Modal>);
  expect(screen.queryByText("Body")).not.toBeInTheDocument();
});
