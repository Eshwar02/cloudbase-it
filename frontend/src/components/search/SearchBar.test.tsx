import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

test("debounces and reports the query", async () => {
  const onSearch = vi.fn();
  render(<SearchBar onSearch={onSearch} />);
  await userEvent.type(screen.getByLabelText("Search"), "inv");
  await waitFor(() => expect(onSearch).toHaveBeenCalledWith("inv"), { timeout: 1000 });
});
