import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/axios";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";

interface PublicFile {
  item_type: "file"; name: string; role: string;
  mime_type: string | null; size_bytes: number; download_url: string;
}
interface PublicFolder {
  item_type: "folder"; name: string; role: string;
  folders: { id: string; name: string }[];
  files: { id: string; name: string; size_bytes: number; mime_type: string | null }[];
}
type PublicResource = PublicFile | PublicFolder;

export default function PublicPage() {
  const { token } = useParams();
  const [data, setData] = useState<PublicResource | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(pw?: string) {
    setLoading(true); setError(null);
    try {
      const r = await api.get<PublicResource>(`/public/${token}`, {
        params: pw ? { password: pw } : undefined,
      });
      setData(r.data); setNeedsPassword(false);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401) { setNeedsPassword(true); setError(pw ? "Wrong password" : null); }
      else if (status === 410) setError("This link has expired.");
      else setError("This link is not available.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-brand-violet">Cloudbase — Shared</h1>
      {loading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : needsPassword ? (
        <div className="glass space-y-3 rounded-xl2 p-6">
          <p className="text-slate-600">This link is password protected.</p>
          {error && <p className="text-red-500">{error}</p>}
          <div className="flex gap-2">
            <input type="password" aria-label="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-full border border-white/50 bg-white/70 px-4 py-2 outline-none" />
            <Button intent="primary" onClick={() => load(password)}>Unlock</Button>
          </div>
        </div>
      ) : error ? (
        <p className="glass rounded-xl2 p-6 text-center text-slate-500">{error}</p>
      ) : data?.item_type === "file" ? (
        <div className="glass space-y-4 rounded-xl2 p-6">
          <p className="text-lg font-medium text-slate-700">📄 {data.name}</p>
          <a href={data.download_url} target="_blank" rel="noreferrer">
            <Button intent="success">Download</Button>
          </a>
        </div>
      ) : data ? (
        <div className="glass space-y-2 rounded-xl2 p-6">
          <p className="mb-2 text-lg font-medium text-slate-700">📁 {data.name}</p>
          {data.folders.map((f) => (
            <p key={f.id} className="text-slate-600">📁 {f.name}</p>
          ))}
          {data.files.map((f) => (
            <p key={f.id} className="text-slate-600">📄 {f.name}</p>
          ))}
          {data.folders.length === 0 && data.files.length === 0 && (
            <p className="text-slate-400">Empty folder.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
