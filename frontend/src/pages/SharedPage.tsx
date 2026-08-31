import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Spinner } from "../components/ui/Spinner";
import { useShared } from "../hooks/useShared";
import { getDownloadUrl } from "../api/files";
import { useToast } from "../components/ui/Toast";

export default function SharedPage() {
  const shared = useShared();
  const nav = useNavigate();
  const { notify } = useToast();

  async function openItem(item: { id: string; item_type: "file" | "folder" }) {
    if (item.item_type === "folder") { nav(`/folder/${item.id}`); return; }
    try {
      window.open(await getDownloadUrl(item.id), "_blank");
    } catch {
      notify("Could not open file", "error");
    }
  }

  return (
    <div>
      <Topbar />
      <h1 className="px-6 py-4 text-xl font-semibold text-slate-700">Shared with me</h1>
      {shared.isLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (shared.data ?? []).length === 0 ? (
        <p className="p-8 text-center text-slate-400">Nothing shared with you yet.</p>
      ) : (
        <ul className="space-y-3 p-4">
          {(shared.data ?? []).map((i) => (
            <li key={`${i.item_type}-${i.id}`} className="glass flex items-center gap-3 rounded-xl2 p-4">
              <button className="flex-1 text-left text-slate-700" onClick={() => openItem(i)}>
                {i.item_type === "folder" ? "📁" : "📄"} {i.name}
              </button>
              <span className="text-sm text-slate-400">{i.role} · {i.owner_email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
