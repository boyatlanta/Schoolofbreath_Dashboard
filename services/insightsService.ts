type OptimizeResult = { description: string } | null;

type SuggestMode = "title" | "description" | "both";

interface MantraSuggestionInput {
  title?: string;
  deity?: string;
  benefit?: string;
  mode?: SuggestMode;
}

interface MantraSuggestion {
  title: string;
  description: string;
}

const DEFAULT_GOOGLE_MODEL = "gemini-2.0-flash";

const compact = (value: string): string => value.replace(/\s+/g, " ").trim();

const toCategoryLabel = (category: string): string =>
  compact(category.replace(/[_-]+/g, " ")) || "wellness";

const toReadableLabel = (value: string): string =>
  compact(value.replace(/[_-]+/g, " "))
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const truncate = (value: string, max = 120): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
};

const getGoogleModel = (): string =>
  compact(import.meta.env.VITE_GOOGLE_AI_MODEL || DEFAULT_GOOGLE_MODEL);

const getGoogleApiKey = (): string =>
  compact(import.meta.env.VITE_GOOGLE_AI_API_KEY || "");

const fallbackMantraSuggestion = ({
  title,
  deity,
  benefit,
}: MantraSuggestionInput): MantraSuggestion => {
  const cleanTitle = compact(title || "");
  const cleanDeity = compact(deity || "");
  const cleanBenefit = compact(benefit || "");

  const generatedTitle =
    cleanTitle ||
    [toReadableLabel(cleanBenefit), toReadableLabel(cleanDeity), "Mantra"]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Sacred Mantra for Inner Calm";

  const detail = [cleanBenefit, cleanDeity]
    .map(toReadableLabel)
    .filter(Boolean)
    .join(" and ");
  const generatedDescription = detail
    ? `${generatedTitle} to cultivate ${detail.toLowerCase()}.`
    : `${generatedTitle} for calm and focus.`;

  return {
    title: truncate(generatedTitle, 80),
    description: truncate(generatedDescription, 160),
  };
};

const parseJsonObject = (text: string): Record<string, unknown> | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
};

const buildPrompt = ({
  title,
  deity,
  benefit,
  mode,
}: Required<MantraSuggestionInput>): string => {
  const cleanTitle = compact(title);
  const cleanDeity = compact(deity);
  const cleanBenefit = compact(benefit);

  return [
    "You are writing copy for a wellness admin dashboard.",
    `Mantra context: deity="${cleanDeity}", benefit="${cleanBenefit}", existingTitle="${cleanTitle || "N/A"}".`,
    `Task mode: ${mode}.`,
    'Return only valid JSON with keys: "title" and "description".',
    "Rules:",
    "- Keep title between 3 and 7 words, devotional and clear.",
    "- Keep description 1 short sentence, under 160 characters.",
    "- No hashtags, no quotes, no emojis.",
    "- English only.",
    "- If mode is description, keep title close to the existingTitle.",
    "- If mode is title, still return a matching short description.",
  ].join("\n");
};

const requestGoogleMantraSuggestion = async (
  input: Required<MantraSuggestionInput>
): Promise<MantraSuggestion | null> => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) return null;

  const model = getGoogleModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 220,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google AI request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) return null;

  const parsed = parseJsonObject(text);
  if (!parsed) return null;

  const aiTitle = compact(String(parsed.title || ""));
  const aiDescription = compact(String(parsed.description || ""));
  if (!aiTitle && !aiDescription) return null;

  return {
    title: truncate(aiTitle, 80),
    description: truncate(aiDescription, 160),
  };
};

export const suggestMantraContent = async (
  input: MantraSuggestionInput
): Promise<MantraSuggestion | null> => {
  const hydratedInput: Required<MantraSuggestionInput> = {
    title: compact(input.title || ""),
    deity: compact(input.deity || "UNIVERSAL"),
    benefit: compact(input.benefit || "CALM"),
    mode: input.mode || "both",
  };

  try {
    const aiSuggestion = await requestGoogleMantraSuggestion(hydratedInput);
    if (aiSuggestion) {
      const fallback = fallbackMantraSuggestion(input);
      return {
        title: aiSuggestion.title || fallback.title,
        description: aiSuggestion.description || fallback.description,
      };
    }
  } catch {
    // Fall through to deterministic local suggestion.
  }

  return fallbackMantraSuggestion(input);
};

export const optimizeContent = async (
  title: string,
  category: string,
  benefits: string[] = []
): Promise<OptimizeResult> => {
  const cleanTitle = compact(title);
  if (!cleanTitle) return null;

  const suggestion = await suggestMantraContent({
    title: cleanTitle,
    benefit: benefits[0],
    deity: category,
    mode: "description",
  });
  if (suggestion?.description) {
    return { description: truncate(suggestion.description, 160) };
  }

  const cleanBenefits = benefits.map(compact).filter(Boolean).slice(0, 2);
  const base = `${cleanTitle} for ${toCategoryLabel(category)}`;
  const suffix =
    cleanBenefits.length > 0
      ? ` to support ${cleanBenefits.join(" and ")}.`
      : " for calm and focus.";

  return { description: truncate(base + suffix, 160) };
};

export const generateEngagementSummary = async (stats: any): Promise<string> => {
  if (!Array.isArray(stats) || stats.length === 0) {
    return "Dashboard metrics are up to date. Keep publishing consistently this week.";
  }

  const first = stats[0];
  const label = typeof first?.label === "string" ? first.label : "Top metric";
  const value =
    typeof first?.value === "string" || typeof first?.value === "number"
      ? String(first.value)
      : "N/A";

  return `${label} is ${value}. Keep consistency in fresh uploads to sustain engagement growth.`;
};
