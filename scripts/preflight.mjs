import { readFileSync } from "node:fs";
const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
if (config.d1_databases[0].database_id.startsWith("00000000"))
  throw Error(
    "Configure your own D1 ID with node scripts/configure-db.mjs <ID> before deployment.",
  );
if (config.assets.not_found_handling !== "single-page-application")
  throw Error("SPA asset routing required.");
console.log(
  "Cloudflare bindings configured. Free-tier production CPU and traffic limits must still be monitored.",
);
