/** RFC-4122 UUID v4 (hex segments 8-4-4-4-12). */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTaskId(id: string | null | undefined): id is string {
  return typeof id === "string" && UUID_V4.test(id.trim());
}
