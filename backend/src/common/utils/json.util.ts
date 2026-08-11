// The local SQLite connector does not support Prisma's `Json` scalar type (only PostgreSQL,
// MySQL, SQL Server, MongoDB, and CockroachDB do) — `npx prisma migrate dev` fails validation
// otherwise. So every field that was `Json`/`Json?` in the PostgreSQL design
// (database-design.md's JSONB columns) is stored as a JSON-encoded `String`/`String?` here
// instead. These helpers keep that an implementation detail: application code still works with
// plain JS objects; only the DB write/read boundary serializes/deserializes.
//
// `replacer` converts BigInt to a string during stringify, since JSON.stringify throws on BigInt
// otherwise (Dates and Prisma.Decimal already serialize correctly via their own toJSON()).
function replacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

// For required String columns (rawResult, payload, serverVersionSnapshot, clientVersionSnapshot,
// suggestion) — always produces a string, defaulting to the JSON literal "null" if given
// undefined/null (these fields are never actually optional at the call sites that use this).
export function toJsonString(value: unknown): string {
  return JSON.stringify(value ?? null, replacer);
}

// For nullable String? columns (beforeValue, afterValue, inputDataRef) — stores an actual SQL
// NULL when the value is absent, rather than the JSON literal "null" string.
export function toNullableJsonString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value, replacer);
}

// Inverse of the above — used wherever a stored JSON string needs to come back out as a plain
// object for an API response (e.g. sync conflict snapshots, AI suggestion payloads).
export function fromJsonString<T = unknown>(value: string | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
