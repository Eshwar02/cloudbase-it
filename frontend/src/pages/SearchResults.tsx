import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { SearchBar } from "../components/search/SearchBar";
import { Icon } from "../components/ui/Icon";
import { Spinner } from "../components/ui/Spinner";
import { fileIcon } from "../components/files/fileIcon";
import { useSearch } from "../hooks/useSearch";

export default function SearchResults() {
  const [q, setQ] = useState("");
  const [semantic, setSemantic] = useState(false);
  const { data, isLoading, isFetching } = useSearch(q, "all", semantic);
  return (
    <div>
      <Topbar>
        <SearchBar onSearch={setQ} semantic={semantic}
          onToggleSemantic={setSemantic} />
      </Topbar>
      <h1 className="px-6 pb-3 pt-2 text-[22px] text-g-text dark:text-gray-100">
        {q ? `${semantic ? "AI results" : "Results"} for "${q}"` : "Search your Drive"}
      </h1>
      {(isLoading || isFetching) && q ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (
        <ul className="space-y-2 px-4 pb-8">
          {(data ?? []).map((r) => {
            const ic = r.type === "folder" ? { icon: "folder", color: "text-g-muted" } : fileIcon(r.name, r.mime_type);
            return (
              <li key={`${r.type}-${r.id}`} className="flex items-center gap-3 rounded-lg border border-g-border px-4 py-2.5 text-sm text-g-text hover:bg-g-hover dark:border-white/10 dark:text-gray-100 dark:hover:bg-white/5">
                <Icon name={ic.icon} size={20} className={ic.color} fill />
                <span className="truncate">{r.name}</span>
              </li>
            );
          })}
          {q && (data ?? []).length === 0 && !isFetching && (
            <p className="p-12 text-center text-g-muted">No matches.</p>
          )}
        </ul>
      )}
    </div>
  );
}
