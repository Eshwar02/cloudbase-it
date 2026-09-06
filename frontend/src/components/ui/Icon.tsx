/**
 * Material Symbols (Outlined) icon.
 * Renders Google's icon font — the same glyphs Google Drive uses.
 * `size` sets the font-size in px; `fill` toggles the filled variant.
 */
export function Icon({
  name,
  size = 20,
  fill = false,
  className = "",
  weight,
}: {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
  weight?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight ?? 400}, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  );
}
