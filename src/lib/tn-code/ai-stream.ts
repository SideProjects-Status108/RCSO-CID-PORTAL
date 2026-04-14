/** NDJSON lines for TN Code AI streaming responses (summary + lookup). */
export function ndjsonLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`)
}
