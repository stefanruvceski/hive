/** A new row id; modules keep their own helper because they never import each other. */
export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
