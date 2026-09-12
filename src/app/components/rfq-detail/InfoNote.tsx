export function InfoNote({ text }: { text: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70">
      {text}
    </div>
  );
}
