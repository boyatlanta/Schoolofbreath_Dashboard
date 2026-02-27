const DEFAULT_DURATION_TIMEOUT_MS = 15000;

const isValidDuration = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

export const getAudioDurationInSeconds = async (
  sourceUrl: string,
  timeoutMs = DEFAULT_DURATION_TIMEOUT_MS
): Promise<number> => {
  const trimmedUrl = sourceUrl.trim();
  if (!trimmedUrl) {
    throw new Error("Audio URL is required to calculate duration.");
  }
  if (typeof Audio === "undefined") {
    throw new Error("Audio duration calculation is not supported here.");
  }

  return new Promise<number>((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };

    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };

    const handleLoadedMetadata = () => {
      const parsedDuration = Math.round(audio.duration);
      if (!isValidDuration(parsedDuration)) {
        fail("Could not calculate duration from this audio URL.");
        return;
      }
      cleanup();
      resolve(parsedDuration);
    };

    const handleError = () => {
      fail("Unable to load audio metadata from this URL.");
    };

    timeoutId = setTimeout(() => {
      fail("Audio duration lookup timed out. Please verify the audio URL.");
    }, timeoutMs);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);
    audio.src = trimmedUrl;
    audio.load();
  });
};

export const formatDurationLabel = (
  durationSeconds?: number | null
): string => {
  if (typeof durationSeconds !== "number" || !isValidDuration(durationSeconds)) {
    return "--";
  }
  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
