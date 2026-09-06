import { api } from "../lib/axios";

export interface HelpMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HelpChatResponse {
  reply: string;
  source: "ai" | "faq";
}

export const helpChat = (message: string, history: HelpMessage[]) =>
  api.post<HelpChatResponse>("/ai/help-chat", { message, history }).then((r) => r.data);
