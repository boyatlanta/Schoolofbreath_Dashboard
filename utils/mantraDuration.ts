const isWholePositiveNumber = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

/**
 * Parse manual mantra duration input.
 * Supported formats:
 * - "330" (seconds)
 * - "5:30" (mm:ss)
 * - "1:05:30" (hh:mm:ss)
 */
export const parseDurationInputToSeconds = (
  input: string | number | null | undefined
): number | null => {
  if (typeof input === "number") {
    if (!isWholePositiveNumber(input)) return null;
    return Math.round(input);
  }

  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return isWholePositiveNumber(seconds) ? Math.round(seconds) : null;
  }

  const parts = raw.split(":").map((segment) => segment.trim());
  if (
    parts.length < 2 ||
    parts.length > 3 ||
    !parts.every((segment) => /^\d+$/.test(segment))
  ) {
    return null;
  }

  const values = parts.map(Number);
  const seconds =
    parts.length === 3
      ? values[0] * 3600 + values[1] * 60 + values[2]
      : values[0] * 60 + values[1];

  return isWholePositiveNumber(seconds) ? Math.round(seconds) : null;
};

export const formatSecondsForDurationInput = (
  seconds: number | null | undefined
): string => {
  if (typeof seconds !== "number" || !isWholePositiveNumber(seconds)) return "";

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  return `${Math.floor(total / 60)}:${String(secs).padStart(2, "0")}`;
};
