/** Hosting-aware URLs: GitHub project Pages has a prefix and no server-side API. */
export function deliveryTarget(base: string, staticHost: boolean) {
  if (!base.startsWith("/") || base.startsWith("//"))
    throw Error("A same-origin base path is required");
  const prefix = base.endsWith("/") ? base : base + "/";
  return {
    snapshot: prefix + "pulse/latest.json",
    api: staticHost ? null : "/api/pulse/",
    router: staticHost ? ("hash" as const) : ("browser" as const),
  };
}
