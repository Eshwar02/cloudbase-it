import type { BreadcrumbEntry } from "../../types";

export function Breadcrumb({ entries, onNavigate }: {
  entries: BreadcrumbEntry[]; onNavigate: (id: string | null) => void;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-600">
      <button className="text-brand-blue" onClick={() => onNavigate(null)}>My Drive</button>
      {entries.map((e) => (
        <span key={e.id} className="flex items-center gap-1">
          <span className="text-slate-300">/</span>
          <button className="hover:text-brand-blue" onClick={() => onNavigate(e.id)}>{e.name}</button>
        </span>
      ))}
    </nav>
  );
}
