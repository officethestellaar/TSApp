import { Prisma } from '@prisma/client';

const KNOWN_REQUEST_MESSAGES: Record<string, string> = {
  P2002: 'A record with these details already exists.',
  P2003: 'A related record could not be found.',
  P2025: 'The requested record no longer exists.',
  P1001: 'The database is unreachable. Please try again.',
  P1008: 'The database operation took too long and was cancelled.',
};

/**
 * Builds a client-safe message for a failed request.
 *
 * Prisma error messages embed a multi-line dump of the call site, including
 * absolute server file paths, so they are never forwarded verbatim. Known
 * request errors map to a fixed sentence, validation errors keep only the
 * offending field, and anything else falls back to its own message.
 */
export function describeError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return KNOWN_REQUEST_MESSAGES[error.code] || 'The request could not be completed.';
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // Covers "Argument `x`: ...", "Argument `x` is missing." and
    // "Unknown argument `x`. ..." — all keep the caller-facing reason while
    // dropping the invocation dump and the file path that precede them.
    const argument = error.message.match(/argument `[^`]+`[^\n]*/i);
    if (!argument) return 'The request payload is invalid.';
    return argument[0].trim().replace(/^argument/, 'Argument');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}