import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";

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
    <div className="flex w-full max-w-2xl items-center gap-2">
      <div className="flex flex-1 items-center gap-3 rounded-full bg-g-hover px-4 py-2.5 transition-colors focus-within:bg-white focus-within:shadow-[0_1px_3px_1px_rgba(60,64,67,.15)]">
        <Icon name="search" size={22} className="text-g-muted" />
        <input
          aria-label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={semantic ? "Search by meaning…" : "Search in Cloudbase"}
          className="w-full bg-transparent text-[15px] text-g-text outline-none placeholder:text-g-muted"
        />
      </div>
      {onToggleSemantic && (
        <button
          type="button"
          role="switch"
          aria-checked={semantic}
          aria-label="Semantic search"
          onClick={() => onToggleSemantic(!semantic)}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            semantic ? "bg-g-blue text-white" : "bg-g-hover text-g-muted hover:bg-g-border/60"
          }`}
        >
          <Icon name="auto_awesome" size={16} /> AI
        </button>
      )}
    </div>
  );
}
