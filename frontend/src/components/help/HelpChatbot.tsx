import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import { helpChat, type HelpMessage } from "../../api/help";

interface Msg extends HelpMessage {
  source?: "ai" | "faq";
}

const GREETING: Msg = {
  role: "assistant",
  content: "Hi! I'm the Cloudbase assistant. Ask me how to do anything — upload, share, restore, settings, and more.",
};

export function HelpChatbot({ onBack, seed }: { onBack: () => void; seed?: string }) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el?.scrollTo) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const history: HelpMessage[] = messages
      .filter((m) => m !== GREETING)
      .map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    scrollToEnd();
    try {
      const res = await helpChat(trimmed, history);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, source: res.source }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "Sorry, I couldn't reach the assistant just now. Please try again.",
      }]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  // Auto-ask a seeded question (e.g. when opened from a help topic).
  useEffect(() => {
    if (seed && !seeded.current) {
      seeded.current = true;
      send(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-g-border px-3 py-3 dark:border-white/10">
        <button aria-label="Back to help" onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full text-g-muted hover:bg-g-hover dark:hover:bg-white/10">
          <Icon name="arrow_back" size={20} />
        </button>
        <span className="flex items-center gap-2 text-base font-medium text-g-text dark:text-gray-100">
          <Icon name="smart_toy" size={20} className="text-g-blue" /> Help assistant
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              m.role === "user"
                ? "bg-g-blue text-white"
                : "bg-g-hover text-g-text dark:bg-white/10 dark:text-gray-100"
            }`}>
              {m.content}
              {m.source && (
                <span className="mt-1 block text-[11px] opacity-60">
                  {m.source === "ai" ? "AI" : "Help FAQ"}
                </span>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-g-hover px-3.5 py-2 dark:bg-white/10"><Spinner /></div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 border-t border-g-border p-3 dark:border-white/10"
      >
        <input
          aria-label="Message the assistant"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-full bg-g-hover px-4 py-2.5 text-sm text-g-text outline-none placeholder:text-g-muted dark:bg-white/10 dark:text-gray-100"
        />
        <button type="submit" aria-label="Send" disabled={!input.trim() || sending}
          className="grid h-10 w-10 place-items-center rounded-full bg-g-blue text-white disabled:opacity-40">
          <Icon name="send" size={20} />
        </button>
      </form>
    </div>
  );
}
