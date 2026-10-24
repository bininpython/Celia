const HEX = /^#[0-9a-fA-F]{6}$/;

/** Aplica a cor principal configurada pela academia (padrão #FF651C). */
export function BrandStyle({ color }: { color: string | null | undefined }) {
  if (!color || !HEX.test(color) || color.toUpperCase() === "#FF651C") return null;
  const css = `:root,.dark{--primary:${color};--ring:${color};--chart-1:${color};--primary-strong:color-mix(in oklab, ${color} 82%, black);--accent:color-mix(in oklab, ${color} 10%, white);}.dark{--accent:color-mix(in oklab, ${color} 18%, #141619);}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
