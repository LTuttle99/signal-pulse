import { it, expect } from "vitest";
import { deliveryTarget } from "../shared/delivery";
it("keeps GitHub Pages snapshot requests inside the project prefix and avoids nonexistent APIs", () => {
  expect(deliveryTarget("/signal-pulse/", true)).toEqual({
    snapshot: "/signal-pulse/pulse/latest.json",
    api: null,
    router: "hash",
  });
  expect(deliveryTarget("/other-project", true).snapshot).toBe(
    "/other-project/pulse/latest.json",
  );
});
it("retains clean browser routing and the cached API for Cloudflare and local development", () => {
  expect(deliveryTarget("/", false)).toEqual({
    snapshot: "/pulse/latest.json",
    api: "/api/pulse/",
    router: "browser",
  });
});
it("refuses an external origin as a deployment prefix", () => {
  expect(() => deliveryTarget("//example.org/", true)).toThrow();
  expect(() => deliveryTarget("https://example.org/", true)).toThrow();
});
