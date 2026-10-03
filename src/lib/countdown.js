import React from "react";

// Helper to format countdown given a received_at ISO and time_limit_hours
// returns { text, status: 'green'|'amber'|'red', overdueMs }
export function getCountdown(receivedAt, timeLimitHours, endedAt) {
  if (!receivedAt) return { text: "--:--:--", status: "green", overdueMs: 0, msLeft: 0 };
  const start = new Date(receivedAt).getTime();
  const limitMs = timeLimitHours * 3600 * 1000;
  const deadline = start + limitMs;
  const now = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diff = deadline - now;

  if (diff <= 0) {
    const overdueMs = -diff;
    const h = Math.floor(overdueMs / 3600000);
    const m = Math.floor((overdueMs % 3600000) / 60000);
    const s = Math.floor((overdueMs % 60000) / 1000);
    return {
      text: `-${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      status: "red",
      overdueMs,
      msLeft: diff,
    };
  }

  const pct = diff / limitMs;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  let status = "green";
  if (pct < 0.25) status = "amber";
  return {
    text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    status,
    overdueMs: 0,
    msLeft: diff,
  };
}

export const countdownColors = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

export function useNowTicker(intervalMs = 1000) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}