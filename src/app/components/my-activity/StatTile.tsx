export function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "blue" | "teal";
}) {
  const toneMap = {
    cyan: "text-cyan-400",
    blue: "text-blue-400",
    teal: "text-state-settled",
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="min-w-0">
        <div className="text-[0.65rem] sm:text-xs uppercase tracking-wider text-white/50">
          {label}
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${toneMap[tone]}`}>{value}</div>
      </div>
    </div>
  );
}
