import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

test("calls onClick and shows loading spinner", async () => {
  const onClick = vi.fn();
  const { rerender } = render(<Button onClick={onClick}>Save</Button>);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onClick).toHaveBeenCalledOnce();

  rerender(<Button isLoading>Save</Button>);
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.getByRole("button")).toBeDisabled();
});
