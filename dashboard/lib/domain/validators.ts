const TM_VALID_STATUSES = new Set([
  "pending",
  "in-progress",
  "done",
  "deferred",
  "cancelled",
  "blocked",
  "review",
]);

const CUSTOM_STATUSES = new Set(["paused", "verified"]);

export function isValidTmStatus(status: string): boolean {
  return TM_VALID_STATUSES.has(status);
}

export function isCustomStatus(status: string): boolean {
  return CUSTOM_STATUSES.has(status);
}

export function validateTaskFields(fields: {
  title?: string;
  description?: string;
}): { valid: boolean; error?: string } {
  if (fields.title !== undefined && !fields.title.trim()) {
    return { valid: false, error: "title cannot be empty" };
  }
  return { valid: true };
}
