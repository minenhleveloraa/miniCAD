export function isOfficerRole(appMetadata: unknown) {
  if (typeof appMetadata !== "object" || appMetadata === null) {
    return false;
  }

  return "role" in appMetadata && appMetadata.role === "officer";
}
