import { Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { SeedlingIllustration } from "@/app/components/illustrations";

export function ActivityEmptyState({ onCreateRFQ }: { onCreateRFQ: () => void }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 sm:p-12 text-center">
      <SeedlingIllustration className="mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">Nothing here yet</h3>
      <p className="text-sm text-white/50 mb-6">
        Post an RFQ or quote on one to see activity here.
      </p>
      <Button
        onClick={onCreateRFQ}
        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create RFQ
      </Button>
    </div>
  );
}
