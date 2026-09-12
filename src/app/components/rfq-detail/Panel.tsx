import { motion } from "motion/react";
import type { ReactNode } from "react";

const toneBg: Record<string, string> = {
  purple: "from-purple-500/10 to-pink-500/10 border-purple-500/20",
  green: "from-green-500/10 to-emerald-500/10 border-green-500/20",
  blue: "from-blue-500/10 to-purple-500/10 border-blue-500/20",
  orange: "from-orange-500/10 to-amber-500/10 border-orange-500/20",
  gray: "from-gray-500/10 to-gray-600/10 border-gray-500/20",
  red: "from-red-500/10 to-rose-500/10 border-red-500/20",
};

export function Panel({
  icon,
  title,
  subtitle,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone: keyof typeof toneBg | string;
  children?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${toneBg[tone] ?? toneBg.gray} border rounded-xl p-6`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-white/5">{icon}</div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>
          <p className="text-white/60">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}
