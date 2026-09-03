export const APP_ROLES = ["dispatcher", "officer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

type ClaimsShape = {
  app_metadata?: {
    role?: unknown;
  };
  email?: unknown;
  sub?: unknown;
};

function isClaimsShape(value: unknown): value is ClaimsShape {
  return typeof value === "object" && value !== null;
}

/** Reads authorization data only from trusted app metadata in the verified JWT. */
export function getAppRole(claims: unknown): AppRole | null {
  if (!isClaimsShape(claims)) {
    return null;
  }

  const role = claims.app_metadata?.role;
  return role === "dispatcher" || role === "officer" ? role : null;
}

export function getClaimString(
  claims: unknown,
  key: "email" | "sub",
): string | null {
  if (!isClaimsShape(claims)) {
    return null;
  }

  const value = claims[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
