export function getSafeExternalUrl(raw?: string | null): string | undefined {
  const trimmed = (raw || '').trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Reject malformed or relative URLs
  }
  return undefined;
}
