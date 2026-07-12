import { useEffect, useState } from "react";
import { rankingMonthEpochMs, rankingReferenceMonth } from "../lib/ranking-calendar";

/**
 * Sticky calendar-month epoch for Visit-now / best-this-month.
 * Recomputes when the tab becomes visible or gains focus so a long-lived
 * session crossing a month boundary refreshes ranks and card chrome together.
 */
export function useRankingCalendarMonth(): {
  nowEpochMs: number;
  referenceMonth: number;
} {
  const [nowEpochMs, setNowEpochMs] = useState(() => rankingMonthEpochMs());

  useEffect(() => {
    const sync = () => {
      const next = rankingMonthEpochMs();
      setNowEpochMs(prev => (prev === next ? prev : next));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", sync);
    const intervalId = window.setInterval(sync, 60 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", sync);
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    nowEpochMs,
    referenceMonth: rankingReferenceMonth(nowEpochMs),
  };
}
