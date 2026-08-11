import { Prisma } from '@prisma/client';

// Normalizes an arbitrary JS value (often a raw Prisma model result, which may contain
// Date/BigInt/Decimal fields) into something safe to store in a `Json`/`jsonb` column. Dates and
// Prisma.Decimal already serialize correctly via their own toJSON(); BigInt does not, so it's
// converted to a string explicitly to avoid a runtime "Do not know how to serialize a BigInt" error.
// Used anywhere a Prisma model is captured into an audit/conflict snapshot column.
export function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  if (value === undefined || value === null) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }
  const serialized = JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val));
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}
