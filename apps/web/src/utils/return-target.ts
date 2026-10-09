const APP_BASE_URL = "http://station.invalid";
const LOGIN_PATH = "/login";

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Accept only same-station path references that can safely be handed to the router.
 * The fixed base keeps validation identical during SSR and in the browser.
 */
export function getSafeReturnTarget(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    hasControlCharacters(value) ||
    /%(?![\da-f]{2})/i.test(value)
  ) {
    return undefined;
  }

  let decodedValue: string;
  let target: URL;
  let decodedTarget: URL;
  try {
    decodedValue = decodeURIComponent(value);
    target = new URL(value, APP_BASE_URL);
    decodedTarget = new URL(decodedValue, APP_BASE_URL);
  } catch {
    return undefined;
  }

  if (
    hasControlCharacters(decodedValue) ||
    decodedValue.startsWith("//") ||
    decodedValue.includes("\\") ||
    target.origin !== APP_BASE_URL ||
    target.username !== "" ||
    target.password !== "" ||
    decodedTarget.pathname.toLowerCase().replace(/\/$/, "") === LOGIN_PATH
  ) {
    return undefined;
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

export function getSignInDestination(value: unknown): string {
  return getSafeReturnTarget(value) ?? "/me";
}
