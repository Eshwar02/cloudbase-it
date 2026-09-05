import { useEffect, useRef, useState } from "react";

export function SearchBar({
  onSearch,
  onToggleSemantic,
  semantic = false,
}: {
  onSearch: (q: string) => void;
  onToggleSemantic?: (on: boolean) => void;
  semantic?: boolean;
}) {
  const [q, setQ] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSearch(q), 300);
    return () => window.clearTimeout(timer.current);
  }, [q, onSearch]);

  return (
    <div className="flex w-full max-w-md items-center gap-2">
      <input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={semantic ? "Search by meaning…" : "Search files and folders…"}
        className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2 outline-none focus:ring-2 focus:ring-brand-blue" />
      {onToggleSemantic && (
        <button type="button" role="switch" aria-checked={semantic}
          aria-label="Semantic search"
          onClick={() => onToggleSemantic(!semantic)}
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition ${
            semantic ? "bg-brand-blue text-white" : "bg-white/70 text-slate-600"
          }`}>
          ✨ AI
        </button>
      )}
    </div>
  );
}
