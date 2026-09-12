export function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="text-lg font-semibold text-white truncate">{value}</div>
      <div className="text-sm text-white/40 truncate">{unit}</div>
    </div>
  );
}
