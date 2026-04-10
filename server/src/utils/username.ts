export function normalizeUsername(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,24}$/.test(username);
}
