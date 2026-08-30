import { NavLink } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";

export function Sidebar() {
  const { logoutMut } = useAuth();
  const link = "block rounded-full px-4 py-2 font-medium transition-colors";
  const active = "bg-brand-blue text-white";
  const idle = "text-slate-600 hover:bg-white/60";
  return (
    <aside className="glass m-3 flex w-56 flex-col gap-2 rounded-xl2 p-4">
      <h2 className="px-2 pb-2 text-xl font-bold text-brand-violet">Cloudbase</h2>
      <NavLink to="/" end className={({ isActive }) => `${link} ${isActive ? active : idle}`}>My Drive</NavLink>
      <NavLink to="/trash" className={({ isActive }) => `${link} ${isActive ? active : idle}`}>Trash</NavLink>
      <div className="mt-auto">
        <Button intent="ghost" className="w-full" onClick={() => logoutMut.mutate()}>Log out</Button>
      </div>
    </aside>
  );
}
