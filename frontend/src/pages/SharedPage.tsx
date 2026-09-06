import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Icon } from "../components/ui/Icon";
import { Spinner } from "../components/ui/Spinner";
import { fileIcon } from "../components/files/fileIcon";
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
      <h1 className="px-6 pb-3 pt-2 text-[22px] text-g-text">Shared with me</h1>
      {shared.isLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (shared.data ?? []).length === 0 ? (
        <p className="p-12 text-center text-g-muted">Nothing shared with you yet.</p>
      ) : (
        <ul className="space-y-2 px-4 pb-8">
          {(shared.data ?? []).map((i) => {
            const ic = i.item_type === "folder" ? { icon: "folder", color: "text-g-muted" } : fileIcon(i.name);
            return (
              <li key={`${i.item_type}-${i.id}`} className="flex items-center gap-3 rounded-lg border border-g-border px-4 py-2.5 hover:bg-g-hover">
                <Icon name={ic.icon} size={20} className={ic.color} fill />
                <button className="flex-1 truncate text-left text-sm text-g-text" onClick={() => openItem(i)}>
                  {i.name}
                </button>
                <span className="text-sm text-g-muted">{i.role} · {i.owner_email}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
