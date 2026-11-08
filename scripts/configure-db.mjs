import { readFileSync, writeFileSync } from "node:fs";
const id = process.env.D1_DATABASE_ID ?? process.argv[2];
if (
  !id ||
  !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id) ||
  id.startsWith("00000000")
)
  throw Error("Set a real D1_DATABASE_ID or pass it as first argument");
const p = "wrangler.jsonc";
const config = JSON.parse(readFileSync(p, "utf8"));
config.d1_databases[0].database_id = id;
writeFileSync(p, JSON.stringify(config, null, 2) + "\n");
