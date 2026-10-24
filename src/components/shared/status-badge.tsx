import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/lib/labels";

export function StatusBadge<K extends string>({
  map,
  value,
}: {
  map: Record<K, { label: string; tone: Tone }>;
  value: K;
}) {
  const item = map[value];
  return <Badge tone={item?.tone ?? "neutral"}>{item?.label ?? value}</Badge>;
}
