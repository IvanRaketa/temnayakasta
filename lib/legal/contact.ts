export function extractEmail(value: string | undefined) {
  return value?.includes("@") ? value : null;
}

export function getProjectContactEmail() {
  return null;
}
