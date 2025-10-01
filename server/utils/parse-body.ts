import type { JsonValue } from "type-fest";

function safeParse<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
}

export function parseBody<T extends JsonValue | Record<string, unknown> = Record<string, unknown>>(
  input: unknown,
): T {
  if (input == null) {
    return {} as T;
  }
  if (typeof input === "string") {
    return safeParse<T>(input);
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    return safeParse<T>(input.toString("utf8"));
  }
  if (typeof input === "object") {
    return input as T;
  }
  return {} as T;
}
