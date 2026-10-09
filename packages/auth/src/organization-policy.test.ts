import { describe, expect, it } from "vite-plus/test";

import { hasSingleRole } from "./organization-policy";

describe("organization role assignment policy", () => {
  it("accepts one role name", () => {
    expect(hasSingleRole("member")).toBe(true);
  });

  it("rejects role arrays, empty names, and comma-delimited roles", () => {
    expect(hasSingleRole(["member", "admin"])).toBe(false);
    expect(hasSingleRole("")).toBe(false);
    expect(hasSingleRole("member,admin")).toBe(false);
  });
});
