import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Spinner } from "../components/ui/Spinner";
import { fileIcon } from "../components/files/fileIcon";
import { useStarred } from "../hooks/useStarred";
import { getDownloadUrl } from "../api/files";
import { useToast } from "../components/ui/Toast";

export default function StarredPage() {
  const { items, star, unstar } = useStarred();
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
      <h1 className="px-6 pb-3 pt-2 text-[22px] text-g-text">Starred</h1>
      {items.isLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : (items.data ?? []).length === 0 ? (
        <p className="p-12 text-center text-g-muted">No starred items yet.</p>
      ) : (
        <ul className="space-y-2 px-4 pb-8">
          {(items.data ?? []).map((i) => {
            const ic = i.item_type === "folder" ? { icon: "folder", color: "text-g-muted" } : fileIcon(i.name, i.mime_type);
            return (
              <li key={`${i.item_type}-${i.id}`} className="flex items-center gap-3 rounded-lg border border-g-border px-4 py-2.5 hover:bg-g-hover">
                <Icon name={ic.icon} size={20} className={ic.color} fill />
                <button className="flex-1 truncate text-left text-sm text-g-text" onClick={() => openItem(i)}>
                  {i.name}
                </button>
                <Button intent="ghost" onClick={() => {
                  const target = i.item_type === "file" ? { file_id: i.id } : { folder_id: i.id };
                  unstar.mutate(target);
                  notify(`Removed “${i.name}” from starred`, "info", {
                    actionLabel: "Undo",
                    onAction: () => star.mutate(target),
                  });
                }}>
                  <Icon name="star" size={18} fill className="text-g-muted" /> Unstar
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
