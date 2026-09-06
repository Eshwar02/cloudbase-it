import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { HelpChatbot } from "./HelpChatbot";

test("sends a message and shows the assistant reply with a source badge", async () => {
  server.use(http.post("/api/ai/help-chat", async ({ request }) => {
    const body = (await request.json()) as { message: string };
    return HttpResponse.json({ reply: `You asked: ${body.message}`, source: "faq" });
  }));

  render(<HelpChatbot onBack={() => {}} />);
  await userEvent.type(screen.getByLabelText("Message the assistant"), "How do I upload?");
  await userEvent.click(screen.getByRole("button", { name: "Send" }));

  await waitFor(() => expect(screen.getByText("You asked: How do I upload?")).toBeInTheDocument());
  expect(screen.getByText("Help FAQ")).toBeInTheDocument();
});
