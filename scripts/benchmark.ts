import { writeFile } from "node:fs/promises";
const base = process.argv[2] ?? "http://127.0.0.1:8787";
const samples = [];
const paths = [
  "/api/pulse/dashboard",
  "/api/pulse/news",
  "/api/pulse/economy",
  "/api/pulse/diagnostics",
];
for (const path of paths) {
  let bytes = 0,
    hits = 0;
  const timings = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    const r = await fetch(base + path);
    if (!r.ok) throw Error(path + " HTTP " + r.status);
    const b = await r.text();
    JSON.parse(b);
    timings.push(performance.now() - start);
    bytes = new TextEncoder().encode(b).length;
    hits += Number(r.headers.get("x-pulse-cache") === "hit");
  }
  timings.sort((a, b) => a - b);
  samples.push({
    path,
    requests: 20,
    payloadBytes: bytes,
    medianWallMs: timings[10],
    p95WallMs: timings[18],
    observedCacheHits: hits,
  });
}
const report = {
  checkedAt: new Date().toISOString(),
  environment: base,
  workload:
    "80 sequential real Worker/D1 API requests; precomputed JSON chunks; no runtime normalization",
  samples,
  cpuCompliance:
    "NOT ESTABLISHED: local HTTP wall times include I/O and are not production Worker CPU measurements.",
  freeTier:
    "No paid API or service invoked. Production account request and D1 quotas still require account analytics.",
};
await writeFile(
  "docs/workload-measurements.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
