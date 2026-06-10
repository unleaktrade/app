import { useEffect, useState } from "react";

export interface Countdown {
  /** Seconds until the deadline, clamped at 0. 0 when deadlineSec is null. */
  remainingSec: number;
  /** True once a real deadline has passed (never true for null deadlines). */
  expired: boolean;
}

function remainingTo(deadlineSec: number | null): number {
  if (deadlineSec === null) return 0;
  return Math.max(0, deadlineSec - Math.floor(Date.now() / 1000));
}

/** 1-second ticking countdown to a unix-seconds deadline. */
export function useCountdown(deadlineSec: number | null): Countdown {
  const [remainingSec, setRemainingSec] = useState(() => remainingTo(deadlineSec));

  useEffect(() => {
    setRemainingSec(remainingTo(deadlineSec));
    if (deadlineSec === null) return;
    const id = setInterval(() => {
      setRemainingSec(remainingTo(deadlineSec));
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineSec]);

  return { remainingSec, expired: deadlineSec !== null && remainingSec <= 0 };
}
