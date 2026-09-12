/** @vitest-environment jsdom */
// useCountdown derives the remaining time from a ticking clock; it used to
// store it in state and re-set it in an effect, which left one stale frame
// whenever the deadline changed.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "../useCountdown";

const T0 = 1_750_000_000_000; // ms

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("counts down each second and flips expired at zero", () => {
    const { result } = renderHook(() => useCountdown(T0 / 1000 + 3));
    expect(result.current).toEqual({ remainingSec: 3, expired: false });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current).toEqual({ remainingSec: 0, expired: true });
  });

  it("treats a null deadline as no countdown", () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toEqual({ remainingSec: 0, expired: false });
  });

  it("reflects a deadline change in the same render", () => {
    const { result, rerender } = renderHook(({ d }) => useCountdown(d), {
      initialProps: { d: T0 / 1000 + 10 },
    });
    expect(result.current.remainingSec).toBe(10);

    rerender({ d: T0 / 1000 + 60 });

    expect(result.current).toEqual({ remainingSec: 60, expired: false });
  });
});
