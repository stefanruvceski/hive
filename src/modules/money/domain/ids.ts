/** A unique id for a new record (no crypto dependency: time + randomness). */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
