import { Sparkles } from "lucide-react";
import type { AttentionItem } from "@/app/lib/attention";
import { AttentionChip } from "@/app/components/my-activity/AttentionChip";

/**
 * "Needs your attention" strip. Items are pure data (deriveAttentionItems);
 * the screen resolves each chip's handler from `item.kind` at click time via
 * `onAction`, so no navigate / claim closure is captured in a memo.
 */
export function AttentionRibbon({
  items,
  onAction,
}: {
  items: AttentionItem[];
  onAction: (item: AttentionItem) => void;
}) {
  return (
    <div className="mt-4 sm:mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm sm:text-base font-semibold text-white">
          Needs your attention <span className="text-white/40 font-normal">({items.length})</span>
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 scrollbar-thin">
        {items.map((item) => (
          <AttentionChip key={item.id} item={item} onAction={() => onAction(item)} />
        ))}
      </div>
    </div>
  );
}
