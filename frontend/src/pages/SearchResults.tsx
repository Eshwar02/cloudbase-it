import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { SearchBar } from "../components/search/SearchBar";
import { Spinner } from "../components/ui/Spinner";
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
      <h1 className="px-6 py-4 text-lg text-slate-600">
        {q ? `${semantic ? "AI results" : "Results"} for "${q}"` : "Type to search"}
      </h1>
      {(isLoading || isFetching) && q ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (
        <ul className="space-y-2 p-4">
          {(data ?? []).map((r) => (
            <li key={`${r.type}-${r.id}`} className="glass rounded-xl2 p-4 text-slate-700">
              {r.type === "folder" ? "📁" : "📄"} {r.name}
            </li>
          ))}
          {q && (data ?? []).length === 0 && !isFetching && (
            <p className="p-6 text-center text-slate-400">No matches.</p>
          )}
        </ul>
      )}
    </div>
  );
}
