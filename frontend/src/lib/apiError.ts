/**
 * Resolves a human-readable message for a failed API call.
 * Distinguishes transport failures (no response received) from API-level errors,
 * so a downed backend never masquerades as a validation or permission problem.
 */
export function apiErrorMessage(error: any, fallback: string): string {
  const response = error?.response;
  if (!response) {
    return 'Cannot reach the server. Is the backend running on port 5001?';
  }
  return response.data?.message || fallback;
}