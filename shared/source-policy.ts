export function retryTime(
  now: number,
  intervalSeconds: number,
  failures: number,
  retryAfter: string | null = null,
) {
  const exponential =
    Math.min(86400, intervalSeconds * 2 ** Math.min(8, Math.max(1, failures))) *
    1000;
  const header =
    retryAfter === null
      ? 0
      : /^\d+$/.test(retryAfter)
        ? Number(retryAfter) * 1000
        : Math.max(0, Date.parse(retryAfter) - now);
  return new Date(
    now + Math.max(exponential, Number.isFinite(header) ? header : 0),
  ).toISOString();
}
export function sourceAlerts(
  sources: {
    id: string;
    lastSuccess: string | null;
    status: string;
    interval: number;
  }[],
  now: number,
) {
  return sources.flatMap((s) => {
    if (s.status === "disabled" || s.status === "schedule-only") return [];
    if (
      !s.lastSuccess ||
      now - Date.parse(s.lastSuccess) > Math.max(3600000, s.interval * 3000)
    )
      return [
        {
          id: s.id,
          severity: "warning",
          detail: s.lastSuccess
            ? "No successful synchronization within three refresh windows"
            : "Source has never synchronized successfully",
        },
      ];
    return [];
  });
}
