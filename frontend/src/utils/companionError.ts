/** Extract a user-facing message from a Companion App HTTP error body. */
export function parseCompanionError(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Erreur inconnue';

  try {
    const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
    if (typeof parsed.error === 'string' && parsed.error.length > 0) return parsed.error;
    if (typeof parsed.message === 'string' && parsed.message.length > 0) return parsed.message;
  } catch {
    // Not JSON — fall through to raw text.
  }

  return trimmed;
}
