/** Short vibration for mobile success feedback (no-op if unsupported). */
export function hapticSuccess(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10)
    }
  } catch {
    /* ignore */
  }
}
