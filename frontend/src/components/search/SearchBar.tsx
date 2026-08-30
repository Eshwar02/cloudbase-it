import { useEffect, useRef, useState } from "react";

export function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch(q), 300);
    return () => window.clearTimeout(timer.current);
  }, [q, onSearch]);

  return (
    <input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)}
      placeholder="Search files and folders…"
      className="w-full max-w-md rounded-full border border-white/50 bg-white/70 px-4 py-2 outline-none focus:ring-2 focus:ring-brand-blue" />
  );
}
