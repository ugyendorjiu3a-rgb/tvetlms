// SQLite has no native array/scalar-list type (unlike the PostgreSQL target in
// database-design.md), so `Assignment.allowedFileTypes` and `Resource.tags` are stored as
// JSON-encoded strings in local dev mode (see prisma/schema.prisma header note). These helpers
// keep that an implementation detail: the HTTP API still sends/receives plain string arrays.
export function encodeStringArray(values: string[] | undefined): string {
  return JSON.stringify(values ?? []);
}

export function decodeStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
