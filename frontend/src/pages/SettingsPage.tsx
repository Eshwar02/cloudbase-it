import { Topbar } from "../components/layout/Topbar";
import { Icon } from "../components/ui/Icon";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

function Row({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-g-border py-4 last:border-0 dark:border-white/10">
      <div>
        <p className="text-sm font-medium text-g-text dark:text-gray-100">{title}</p>
        {description && <p className="mt-0.5 text-sm text-g-muted dark:text-gray-400">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-g-border p-0.5 dark:border-white/15">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === o.value
              ? "bg-g-selected text-g-selectedText dark:bg-[#004a77] dark:text-[#c2e7ff]"
              : "text-g-muted hover:bg-g-hover dark:text-gray-300 dark:hover:bg-white/10"
          }`}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-g-blue" : "bg-g-borderStrong dark:bg-white/25"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

const GB = (n: number) => `${(n / 1024 ** 3).toFixed(2)} GB`;

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const { user } = useAuth();
  const used = user?.storage_used_bytes ?? 0;
  const quota = user?.storage_quota_bytes ?? 0;
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div>
      <Topbar />
      <h1 className="px-6 pb-4 pt-2 text-[22px] text-g-text dark:text-gray-100">Settings</h1>
      <div className="mx-auto max-w-3xl px-6 pb-12">
        <section className="mb-8">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-g-muted dark:text-gray-400">Appearance</h2>
          <Row title="Theme" description="Choose light, dark, or match your device.">
            <Segmented
              value={settings.appearance}
              onChange={(v) => update({ appearance: v })}
              options={[
                { value: "light", label: "Light", icon: "light_mode" },
                { value: "dark", label: "Dark", icon: "dark_mode" },
                { value: "system", label: "System", icon: "computer" },
              ]}
            />
          </Row>
          <Row title="Density" description="Spacing of rows in file lists.">
            <Segmented
              value={settings.density}
              onChange={(v) => update({ density: v })}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
            />
          </Row>
          <Row title="Default view" description="How files open by default.">
            <Segmented
              value={settings.default_view}
              onChange={(v) => update({ default_view: v })}
              options={[
                { value: "list", label: "List", icon: "format_list_bulleted" },
                { value: "grid", label: "Grid", icon: "grid_view" },
              ]}
            />
          </Row>
        </section>

        <section className="mb-8">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-g-muted dark:text-gray-400">Trash</h2>
          <Row title="Confirm before deleting forever" description="Ask for confirmation when permanently deleting.">
            <Switch
              checked={settings.confirm_permanent_delete}
              onChange={(v) => update({ confirm_permanent_delete: v })}
              label="Confirm before deleting forever"
            />
          </Row>
        </section>

        <section className="mb-8">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-g-muted dark:text-gray-400">Storage</h2>
          <div className="py-4">
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-g-border dark:bg-white/10">
              <div className="h-full rounded-full bg-g-blue" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-g-muted dark:text-gray-400">
              {GB(used)} of {GB(quota)} used ({pct.toFixed(1)}%)
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-g-muted dark:text-gray-400">Account</h2>
          <Row title="Email">
            <span className="text-sm text-g-muted dark:text-gray-300">{user?.email}</span>
          </Row>
          <Row title="Display name">
            <span className="text-sm text-g-muted dark:text-gray-300">{user?.display_name}</span>
          </Row>
          <Row title="Member since">
            <span className="text-sm text-g-muted dark:text-gray-300">{memberSince}</span>
          </Row>
        </section>
      </div>
    </div>
  );
}
