import { it, expect } from "vitest";
import {
  companySeeds,
  mergeCompanyCatalog,
  matchCompanies,
} from "../shared/pulse";
it("expands the directory across listed equities and ETFs without duplicate symbols", () => {
  expect(companySeeds.length).toBeGreaterThan(170);
  expect(new Set(companySeeds.map((c) => c.symbol)).size).toBe(
    companySeeds.length,
  );
  for (const symbol of ["AMD", "COST", "LLY", "PLTR", "VOO", "TLT", "BRK.B"])
    expect(companySeeds.some((c) => c.symbol === symbol)).toBe(true);
  expect(companySeeds.find((c) => c.symbol === "AMD")?.kind).toBe("stock");
  expect(companySeeds.find((c) => c.symbol === "VOO")?.kind).toBe("etf");
});
it("upgrades an old cached twelve-company directory while preserving verified filings", () => {
  const old = {
    ...companySeeds[0],
    verifiedAt: "2026-11-01T00:00:00Z",
    filings: [],
    facts: [],
  };
  const merged = mergeCompanyCatalog([old]);
  expect(merged.length).toBe(companySeeds.length);
  expect(merged[0].verifiedAt).toBe(old.verifiedAt);
  expect(mergeCompanyCatalog(merged)).toEqual(merged);
});
it("does not turn common words or bare ticker abbreviations into company associations", () => {
  expect(
    matchCompanies(
      "We are on target for a visa appointment and a cat adoption",
      companySeeds,
    ),
  ).toEqual([]);
  expect(
    matchCompanies(
      "Advanced Micro Devices announces a new processor",
      companySeeds,
    ),
  ).toContain("AMD");
});
