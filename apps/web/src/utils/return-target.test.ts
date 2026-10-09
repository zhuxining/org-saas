import { describe, expect, it } from "vite-plus/test";

import { getSafeReturnTarget, getSignInDestination } from "./return-target";

describe("safe sign-in return targets", () => {
  it("keeps a valid same-site path, search, and fragment", () => {
    expect(getSafeReturnTarget("/org/acme?tab=members#pending")).toBe(
      "/org/acme?tab=members#pending",
    );
  });

  it.each([
    "https://example.com/account",
    "https://user:password@example.com/account",
    "//example.com/account",
    "/%2F%2Fexample.com/account",
    "/%5C%5Cexample.com/account",
    "/bad%encoding",
    "/%0Apath",
    "/login",
    "/login/",
    "/%6Cogin?redirect=%2Fme",
    "\\\\example.com\\account",
    "/path\nnext",
  ])("rejects an unsafe return target: %s", (target) => {
    expect(getSafeReturnTarget(target)).toBeUndefined();
  });

  it("uses the personal space when the return target is missing or unsafe", () => {
    expect(getSignInDestination(undefined)).toBe("/me");
    expect(getSignInDestination("//example.com")).toBe("/me");
  });
});
