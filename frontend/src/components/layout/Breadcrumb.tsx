import type { BreadcrumbEntry } from "../../types";
import { Icon } from "../ui/Icon";

export function Breadcrumb({ entries, onNavigate }: {
  entries: BreadcrumbEntry[]; onNavigate: (id: string | null) => void;
}) {
  const last = entries.length ? entries[entries.length - 1] : null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[22px]">
      <button
        className="rounded px-1 font-normal text-g-text hover:bg-g-hover"
        onClick={() => onNavigate(null)}
      >
        {last ? "My Drive" : "Welcome to Drive"}
      </button>
      {entries.map((e, i) => {
        const isLast = i === entries.length - 1;
        return (
          <span key={e.id} className="flex items-center gap-1">
            <Icon name="chevron_right" size={22} className="text-g-muted" />
            <button
              className={`rounded px-1 hover:bg-g-hover ${isLast ? "text-g-text" : "text-g-muted"}`}
              onClick={() => onNavigate(e.id)}
            >
              {e.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
