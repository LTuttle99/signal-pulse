// Development companion: keep the local D1 preview updated without browser actions.
import { spawn } from "node:child_process";
let running = false;
function collect() {
  if (running) return;
  running = true;
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/pulse-sync.ts", "--db", "--local"],
    { stdio: "inherit", env: process.env },
  );
  child.on("exit", (code) => {
    running = false;
    if (code)
      console.error(
        "Collection failed; previous snapshot remains available. Exit",
        code,
      );
  });
}
collect();
setInterval(collect, 30 * 60 * 1000);
