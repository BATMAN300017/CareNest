/**
 * Safely extracts a user-readable error message from unknown caught errors.
 * Replaces unconstrained `catch (err: any)` throughout the frontend and API layers.
 */
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return fallback;
}
