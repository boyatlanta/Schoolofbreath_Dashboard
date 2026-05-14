import { toast } from "react-toastify";
import referenceBoardImageUrl from "../docs/icons.png";
import referenceGuideMarkdown from "../docs/school_of_breath_ai_icon_system_guide.md?raw";

export type GuidedMeditationIconStyle =
  | "zen-minimal"
  | "sacred-geometry"
  | "nature-flow";

export type GuidedMeditationIconColorMood =
  | "deep-teal-gold"
  | "mint-sage-cream"
  | "lavender-peach"
  | "healing-balanced";

export type GuidedMeditationIconSize = 128 | 256 | 512 | 1024;

export interface GuidedMeditationIconGenerationInput {
  title: string;
  /** Catalog / form description — woven into the prompt for mood and symbolism (no text in icon). */
  description?: string;
  style: GuidedMeditationIconStyle;
  colorMood: GuidedMeditationIconColorMood;
  variationCount: number;
  promptOverride?: string;
  includeSvg?: boolean;
  forceReferenceReanalysis?: boolean;
}

export interface GuidedMeditationIconVariant {
  id: string;
  title: string;
  prompt: string;
  style: GuidedMeditationIconStyle;
  colorMood: GuidedMeditationIconColorMood;
  modelUsed: string;
  createdAt: string;
  originalPngDataUrl: string;
  transparentPngDataUrl: string;
  sizedPngs: Record<GuidedMeditationIconSize, string>;
  sizedTransparentPngs: Record<GuidedMeditationIconSize, string>;
  svgMarkup: string | null;
}

interface ReferenceStyleAnalysis {
  shapeLanguage: string;
  colorBehavior: string;
  lightingAndGlow: string;
  depthAndShadow: string;
  sacredGeometry: string;
  spacingAndCornerRadius: string;
  emotionalTone: string;
  typographyHarmony: string;
  strictAvoidList: string[];
}

type GenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { data?: string; mimeType?: string };
        inline_data?: { data?: string; mime_type?: string };
      }>;
    };
  }>;
};

const ICON_SIZES: GuidedMeditationIconSize[] = [128, 256, 512, 1024];
const REFERENCE_IMAGE_URL = referenceBoardImageUrl;
const REFERENCE_GUIDE_SOURCE = referenceGuideMarkdown;

const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const IMAGE_MODEL_FALLBACKS = [
  DEFAULT_IMAGE_MODEL,
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
] as const;

const TEXT_MODEL_FALLBACKS = [
  DEFAULT_TEXT_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

const STYLE_DETAILS: Record<GuidedMeditationIconStyle, string> = {
  "zen-minimal":
    "Version 1 Zen Minimal: calm meditating silhouette, concentric breath circles, soft cream-to-mint-to-teal gradients, spacious negative space, simplified sacred stillness.",
  "sacred-geometry":
    "Version 2 Sacred Geometry: flower-of-life linework, deep teal base, sacred gold geometric arcs, centered glowing seed-point, symmetric and ceremonial balance.",
  "nature-flow":
    "Version 3 Nature Flow: organic line face profile, gentle leaf motif, airy breath-wave curves, muted mint/sage/cream transitions, soothing natural rhythm.",
};

const COLOR_MOOD_DETAILS: Record<GuidedMeditationIconColorMood, string> = {
  "deep-teal-gold":
    "Prioritize deep teal (#0D4C63), sacred gold (#D8B27A), and mist white (#F8F7F4). Keep high-end, contemplative depth.",
  "mint-sage-cream":
    "Prioritize breath mint (#BDE7DC), soft sage (#C9D8C5), soft sand (#EFE7DD), and subtle teal anchors.",
  "lavender-peach":
    "Prioritize sleep lavender (#D8D4F2), warm peach (#F2D0B3), cream neutrals, and restrained gold micro-accents.",
  "healing-balanced":
    "Balanced healing palette: deep teal, mint, sage, soft cream, lavender, warm peach, with minimal sacred gold highlights.",
};

/**
 * Heuristic style + palette from the meditation title and description (no extra API call).
 * Updates whenever copy changes; admins can still override the dropdowns before Generate.
 */
export function suggestGuidedMeditationIconStyleAndMood(
  title: string,
  description?: string
): {
  style: GuidedMeditationIconStyle;
  colorMood: GuidedMeditationIconColorMood;
} {
  const raw = `${title || ""} ${description || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
  if (!raw) {
    return { style: "zen-minimal", colorMood: "deep-teal-gold" };
  }

  let style: GuidedMeditationIconStyle = "zen-minimal";
  let colorMood: GuidedMeditationIconColorMood = "deep-teal-gold";

  if (
    /(chakra|mandala|sacred geometry|flower of life|merkaba|celestial|cosmic|symmetry|grid|crystal|temple)/.test(
      raw
    )
  ) {
    style = "sacred-geometry";
  } else if (
    /(forest|ocean|mountain|river|leaf|garden|meadow|tree|wave|nature walk|woodland|organic|earth)/.test(raw)
  ) {
    style = "nature-flow";
  }

  if (
    /(sleep|insomnia|dream|night|bedtime|lull|moon|nap|snooze|deep rest|rest for|slumber)/.test(raw)
  ) {
    colorMood = "lavender-peach";
  } else if (/(forest|ocean|garden|spring|meadow|morning dew|fresh air|nature walk|walk in)/.test(raw)) {
    colorMood = "mint-sage-cream";
  } else if (
    /(heart|compassion|self-love|grief|heal|soothe|tender|nurture|restore|wholeness|inner child)/.test(raw)
  ) {
    colorMood = "healing-balanced";
  } else if (
    /(abundance|manifest|prosper|gold|wealth|opulence|chakra work|energy body|solar plexus|power)/.test(raw)
  ) {
    colorMood = "deep-teal-gold";
  }

  return { style, colorMood };
}

const FALLBACK_ANALYSIS: ReferenceStyleAnalysis = {
  shapeLanguage:
    "Rounded-square icon containers, centered motifs, restrained line density, smooth contour silhouettes, and sacred symmetry.",
  colorBehavior:
    "Muted premium wellness palette with teal foundations, cream atmospherics, selective sacred-gold accents, and low-saturation gradients.",
  lightingAndGlow:
    "Soft ambient frontal light, internal glow around focal symbol, diffused highlights, and no hard specular clipping.",
  depthAndShadow:
    "Subtle 3D layering, glassmorphism-inspired translucency, elegant low-contrast shadows, and calm depth without harsh contrast.",
  sacredGeometry:
    "Concentric circles, flower-of-life echoes, halo rings, breath wave arcs, and balanced radial composition.",
  spacingAndCornerRadius:
    "Generous padding, high corner radius, central breathing room, consistent visual margins, and uncluttered negative space.",
  emotionalTone:
    "Calm, safe, healing, premium, intentional, and spiritually modern.",
  typographyHarmony:
    "Typography around icons is elegant serif with disciplined spacing; icon visuals should harmonize without embedded text.",
  strictAvoidList: [
    "cartoon look",
    "harsh contrast",
    "neon cyberpunk",
    "busy detail",
    "generic stock icon",
    "gaming aesthetic",
    "religiously narrow symbolism",
  ],
};

let cachedStyleAnalysisPromise: Promise<ReferenceStyleAnalysis> | null = null;

const compact = (value: string): string => value.replace(/\s+/g, " ").trim();

const parseJsonObject = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
};

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode generated image."));
    image.src = src;
  });

const imageToDataUrlAtSize = async (src: string, size: number): Promise<string> => {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context.");
  }
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, 0, 0, size, size);
  return canvas.toDataURL("image/png");
};

const removeSolidBackground = async (src: string): Promise<string> => {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context.");
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const sample = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]] as const;
  };

  const corners = [
    sample(0, 0),
    sample(width - 1, 0),
    sample(0, height - 1),
    sample(width - 1, height - 1),
  ];

  const [avgR, avgG, avgB] = corners.reduce(
    (acc, [r, g, b]) => [acc[0] + r / 4, acc[1] + g / 4, acc[2] + b / 4],
    [0, 0, 0]
  );

  const HARD_THRESHOLD = 30;
  const SOFT_THRESHOLD = 55;

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    const distance = Math.sqrt(
      (r - avgR) * (r - avgR) +
        (g - avgG) * (g - avgG) +
        (b - avgB) * (b - avgB)
    );

    if (distance <= HARD_THRESHOLD) {
      data[index + 3] = 0;
      continue;
    }

    if (distance <= SOFT_THRESHOLD) {
      const ratio = (distance - HARD_THRESHOLD) / (SOFT_THRESHOLD - HARD_THRESHOLD);
      data[index + 3] = Math.round(data[index + 3] * ratio);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};

const getGoogleApiKey = (): string =>
  compact(import.meta.env.VITE_GOOGLE_AI_API_KEY || "");

const getImageModelCandidates = (): string[] => {
  const configured = compact(import.meta.env.VITE_GOOGLE_IMAGE_MODEL || "");
  return Array.from(new Set([configured, ...IMAGE_MODEL_FALLBACKS].filter(Boolean)));
};

const getTextModelCandidates = (): string[] => {
  const configured = compact(import.meta.env.VITE_GOOGLE_AI_MODEL || "");
  return Array.from(new Set([configured, ...TEXT_MODEL_FALLBACKS].filter(Boolean)));
};

const isModelUnavailableError = (status: number, bodyText: string): boolean => {
  if (status !== 404) return false;
  const lower = bodyText.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("not supported") ||
    lower.includes("no longer available")
  );
};

const requestGoogleWithModelFallback = async (
  modelCandidates: string[],
  bodyBuilder: (model: string) => Record<string, unknown>
): Promise<{ response: GenerateContentResponse; model: string }> => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error("VITE_GOOGLE_AI_API_KEY is not set.");
  }

  let lastError: string | null = null;

  for (const model of modelCandidates) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyBuilder(model)),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      if (isModelUnavailableError(response.status, errorText)) {
        lastError = errorText || `Model ${model} unavailable`;
        continue;
      }
      throw new Error(
        `Google AI request failed (${response.status}) for model ${model}: ${
          errorText || "Unknown error"
        }`
      );
    }

    const parsed = (await response.json()) as GenerateContentResponse;
    return { response: parsed, model };
  }

  throw new Error(
    lastError || "No configured Google image model is available for this account."
  );
};

const getFirstTextPart = (response: GenerateContentResponse): string =>
  response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim() || "";

const extractImageDataUrl = (response: GenerateContentResponse): string | null => {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) return null;

  for (const part of parts) {
    const data = part.inlineData?.data || part.inline_data?.data;
    if (!data) continue;

    const mimeType =
      part.inlineData?.mimeType || part.inline_data?.mime_type || "image/png";
    return `data:${mimeType};base64,${data}`;
  }

  return null;
};

type ReferenceInlinePart = { inline_data: { mime_type: string; data: string } };

const urlToInlineDataPart = async (url: string): Promise<ReferenceInlinePart> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch reference image: ${url}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || "image/png";
  const buffer = await blob.arrayBuffer();
  return {
    inline_data: {
      mime_type: mimeType,
      data: toBase64(buffer),
    },
  };
};

/** One fetch of the bundled reference board for the whole session (was re-fetched per variation). */
let cachedReferenceBoardInlinePart: Promise<ReferenceInlinePart> | null = null;

const getReferenceBoardInlinePart = (): Promise<ReferenceInlinePart> => {
  if (!cachedReferenceBoardInlinePart) {
    cachedReferenceBoardInlinePart = urlToInlineDataPart(REFERENCE_IMAGE_URL);
  }
  return cachedReferenceBoardInlinePart;
};

const normalizeAnalysis = (raw: Record<string, unknown>): ReferenceStyleAnalysis => {
  const strictAvoidList = Array.isArray(raw.strictAvoidList)
    ? raw.strictAvoidList.map((value) => String(value)).filter(Boolean)
    : FALLBACK_ANALYSIS.strictAvoidList;

  return {
    shapeLanguage: compact(String(raw.shapeLanguage || FALLBACK_ANALYSIS.shapeLanguage)),
    colorBehavior: compact(String(raw.colorBehavior || FALLBACK_ANALYSIS.colorBehavior)),
    lightingAndGlow: compact(
      String(raw.lightingAndGlow || FALLBACK_ANALYSIS.lightingAndGlow)
    ),
    depthAndShadow: compact(String(raw.depthAndShadow || FALLBACK_ANALYSIS.depthAndShadow)),
    sacredGeometry: compact(String(raw.sacredGeometry || FALLBACK_ANALYSIS.sacredGeometry)),
    spacingAndCornerRadius: compact(
      String(raw.spacingAndCornerRadius || FALLBACK_ANALYSIS.spacingAndCornerRadius)
    ),
    emotionalTone: compact(String(raw.emotionalTone || FALLBACK_ANALYSIS.emotionalTone)),
    typographyHarmony: compact(
      String(raw.typographyHarmony || FALLBACK_ANALYSIS.typographyHarmony)
    ),
    strictAvoidList,
  };
};

const getReferenceGuideExcerpt = async (): Promise<string> => {
  return (REFERENCE_GUIDE_SOURCE || "").slice(0, 8000);
};

const analyzeReferenceVisualLanguage = async (
  forceReanalysis: boolean
): Promise<ReferenceStyleAnalysis> => {
  if (!forceReanalysis && cachedStyleAnalysisPromise) {
    return cachedStyleAnalysisPromise;
  }

  cachedStyleAnalysisPromise = (async () => {
    try {
      const referenceImagePart = await getReferenceBoardInlinePart();
      const guideText = await getReferenceGuideExcerpt();

      const instructions = [
        "You are a senior visual design system analyst.",
        "Analyze the attached School of Breath icon-board image and extract a strict reusable style DNA for Guided Meditation icons.",
        "Return only valid minified JSON.",
        "Required keys: shapeLanguage, colorBehavior, lightingAndGlow, depthAndShadow, sacredGeometry, spacingAndCornerRadius, emotionalTone, typographyHarmony, strictAvoidList.",
        "strictAvoidList must be an array of 6-10 short items.",
        "Focus on: icon shapes, palette behavior, gradients, glow intensity, shadow softness, sacred geometry usage, visual depth, rounded-corner style, and emotional calmness.",
      ];

      if (guideText) {
        instructions.push(
          "Supplemental style guide excerpt:",
          guideText,
          "Use the style guide only to reinforce what is visible in the image."
        );
      }

      const { response } = await requestGoogleWithModelFallback(
        getTextModelCandidates(),
        (model) => ({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: instructions.join("\n") }, referenceImagePart],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 900,
          },
        })
      );

      const rawText = getFirstTextPart(response);
      const parsed = parseJsonObject(rawText);
      if (!parsed) {
        return FALLBACK_ANALYSIS;
      }

      return normalizeAnalysis(parsed);
    } catch {
      return FALLBACK_ANALYSIS;
    }
  })();

  return cachedStyleAnalysisPromise;
};

const buildGuidedMeditationPrompt = (input: {
  title: string;
  description?: string;
  style: GuidedMeditationIconStyle;
  colorMood: GuidedMeditationIconColorMood;
  analysis: ReferenceStyleAnalysis;
  variationIndex: number;
  promptOverride?: string;
}): string => {
  const title = compact(input.title) || "Inner Stillness";
  const sessionDescription = compact(input.description || "");
  const descriptionForPrompt =
    sessionDescription.length > 1400
      ? `${sessionDescription.slice(0, 1400)}...`
      : sessionDescription;
  const styleDirections = STYLE_DETAILS[input.style];
  const paletteDirections = COLOR_MOOD_DETAILS[input.colorMood];
  const analysis = input.analysis;

  const basePrompt = [
    `Create a premium spiritual wellness mobile app icon for a guided meditation titled "${title}".`,
    "Category scope: Guided Meditation only.",
    ...(descriptionForPrompt
      ? [
          "Session context from catalog (use only for mood, metaphor, and symbolic center; never render as readable text inside the icon):",
          descriptionForPrompt,
        ]
      : []),
    `Variation: ${input.variationIndex + 1}. Keep ecosystem consistency while changing micro-composition details.`,
    "Visual identity lock:",
    `- Shape language: ${analysis.shapeLanguage}`,
    `- Color behavior: ${analysis.colorBehavior}`,
    `- Lighting and glow: ${analysis.lightingAndGlow}`,
    `- Depth and shadow: ${analysis.depthAndShadow}`,
    `- Sacred geometry: ${analysis.sacredGeometry}`,
    `- Spacing and corners: ${analysis.spacingAndCornerRadius}`,
    `- Emotional tone: ${analysis.emotionalTone}`,
    `- Typography harmony context (no text in icon): ${analysis.typographyHarmony}`,
    "Style constraints:",
    `- ${styleDirections}`,
    `- ${paletteDirections}`,
    "Design language requirements:",
    "- Soft 3D glassmorphism, satin gradients, calm luxury interface quality, sacred minimalism.",
    "- Rounded-square icon composition, center-balanced energy, soft ambient glow, elegant but subtle shadows.",
    "- Breath-inspired flow, emotional safety, handcrafted intentionality, Apple-quality wellness polish.",
    "- Keep icon clean and mobile-legible at 128px.",
    "Output rules:",
    "- Single icon artwork only (not a collage, not a card, no text labels, no watermarks, no borders).",
    "- Keep the icon centered in a 1:1 square canvas.",
    "- Use a plain near-white background around the icon silhouette so post-process transparency extraction stays clean.",
    "- Preserve smooth edges and premium anti-aliasing.",
    `Avoid strictly: ${analysis.strictAvoidList.join(", ")}, cheap vector look, busy composition, harsh contrast, neon cyberpunk, cartoon style.`,
  ];

  const override = compact(input.promptOverride || "");
  if (!override) {
    return basePrompt.join("\n");
  }

  return [
    basePrompt.join("\n"),
    "Custom art direction override (must still obey all identity locks above):",
    override,
  ].join("\n\n");
};

const generateOneIconVariant = async (input: {
  title: string;
  description?: string;
  style: GuidedMeditationIconStyle;
  colorMood: GuidedMeditationIconColorMood;
  analysis: ReferenceStyleAnalysis;
  variationIndex: number;
  promptOverride?: string;
  includeSvg?: boolean;
}): Promise<GuidedMeditationIconVariant> => {
  const prompt = buildGuidedMeditationPrompt(input);
  const referenceImagePart = await getReferenceBoardInlinePart();

  const { response, model } = await requestGoogleWithModelFallback(
    getImageModelCandidates(),
    (candidateModel) => {
      // generateContent only supports known generationConfig fields; do not send
      // responseFormat here (that shape is for the Interactions API / other surfaces).
      // See: https://ai.google.dev/gemini-api/docs/image-generation
      const generationConfig: Record<string, unknown> = {
        responseModalities: ["Image"],
      };

      if (/gemini-3/i.test(candidateModel)) {
        generationConfig.imageConfig = {
          aspectRatio: "1:1",
          imageSize: "1K",
        };
      }

      return {
        model: candidateModel,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Reference image attached. Match this style ecosystem exactly while creating a new icon.",
                  prompt,
                ].join("\n\n"),
              },
              referenceImagePart,
            ],
          },
        ],
        generationConfig,
      };
    }
  );

  const originalPngDataUrl = extractImageDataUrl(response);
  if (!originalPngDataUrl) {
    throw new Error("Google image generation returned no image data.");
  }

  const transparentPngDataUrl = await removeSolidBackground(originalPngDataUrl);

  const sizedPngEntries = await Promise.all(
    ICON_SIZES.map(async (size) => [size, await imageToDataUrlAtSize(originalPngDataUrl, size)] as const)
  );

  const sizedTransparentEntries = await Promise.all(
    ICON_SIZES.map(async (size) => [size, await imageToDataUrlAtSize(transparentPngDataUrl, size)] as const)
  );

  const sizedPngs = Object.fromEntries(sizedPngEntries) as Record<
    GuidedMeditationIconSize,
    string
  >;
  const sizedTransparentPngs = Object.fromEntries(sizedTransparentEntries) as Record<
    GuidedMeditationIconSize,
    string
  >;

  const svgMarkup = input.includeSvg
    ? await generateSvgCompanion(prompt, input.analysis)
    : null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title,
    prompt,
    style: input.style,
    colorMood: input.colorMood,
    modelUsed: model,
    createdAt: new Date().toISOString(),
    originalPngDataUrl,
    transparentPngDataUrl,
    sizedPngs,
    sizedTransparentPngs,
    svgMarkup,
  };
};

const generateSvgCompanion = async (
  iconPrompt: string,
  analysis: ReferenceStyleAnalysis
): Promise<string | null> => {
  try {
    const instructions = [
      "Create a clean standalone SVG icon based on this guided meditation visual direction.",
      "Return only raw <svg>...</svg> markup.",
      "No markdown fences, no explanation, no additional text.",
      "Use viewBox=\"0 0 1024 1024\" and transparent background.",
      "Keep paths simple, smooth, and mobile-legible.",
      "No embedded text labels.",
      `Preserve emotional tone: ${analysis.emotionalTone}`,
      `Preserve sacred geometry subtlety: ${analysis.sacredGeometry}`,
      `Icon direction:\n${iconPrompt}`,
    ].join("\n");

    const { response } = await requestGoogleWithModelFallback(
      getTextModelCandidates(),
      (model) => ({
        model,
        contents: [{ role: "user", parts: [{ text: instructions }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1800,
        },
      })
    );

    const raw = getFirstTextPart(response);
    if (!raw) return null;

    const fenced = raw.match(/```(?:svg)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || raw.trim();
    const svgMatch = candidate.match(/<svg[\s\S]*<\/svg>/i);
    return svgMatch?.[0] || null;
  } catch {
    return null;
  }
};

export const isGuidedMeditationIconAiConfigured = (): boolean =>
  Boolean(getGoogleApiKey());

export const getGuidedMeditationReferenceAssets = () => ({
  referenceBoardImageUrl: REFERENCE_IMAGE_URL,
  guideMarkdownUrl: "bundled:school_of_breath_ai_icon_system_guide.md",
});

export const getGuidedMeditationModelDefaults = () => ({
  imageModelCandidates: getImageModelCandidates(),
  textModelCandidates: getTextModelCandidates(),
});

/**
 * Text-only follow-up: SVG companion for an existing icon prompt (one Gemini text call).
 * Use after image generation when you want SVG on demand instead of bundled in the image flow.
 */
export const generateGuidedMeditationSvgFromIconPrompt = async (
  iconPrompt: string
): Promise<string | null> => {
  const analysis = await analyzeReferenceVisualLanguage(false);
  return generateSvgCompanion(iconPrompt, analysis);
};

export const generateGuidedMeditationIconVariants = async (
  input: GuidedMeditationIconGenerationInput
): Promise<GuidedMeditationIconVariant[]> => {
  if (!isGuidedMeditationIconAiConfigured()) {
    throw new Error("Set VITE_GOOGLE_AI_API_KEY before generating icons.");
  }

  const title = compact(input.title);
  if (!title) {
    throw new Error("Meditation title is required for icon generation.");
  }

  const variationCount = Math.min(6, Math.max(1, Math.round(input.variationCount || 1)));
  const analysis = await analyzeReferenceVisualLanguage(
    Boolean(input.forceReferenceReanalysis)
  );

  const results: GuidedMeditationIconVariant[] = [];

  const description = compact(input.description || "");

  for (let index = 0; index < variationCount; index += 1) {
    const variant = await generateOneIconVariant({
      title,
      description: description || undefined,
      style: input.style,
      colorMood: input.colorMood,
      analysis,
      variationIndex: index,
      promptOverride: input.promptOverride,
      includeSvg: input.includeSvg,
    });
    results.push(variant);
  }

  return results;
};

export const applyVariantToImageField = (
  variant: GuidedMeditationIconVariant,
  options?: { preferTransparent?: boolean; preferredSize?: GuidedMeditationIconSize }
): string => {
  const preferTransparent = options?.preferTransparent ?? true;
  const preferredSize = options?.preferredSize ?? 1024;

  if (preferTransparent) {
    return variant.sizedTransparentPngs[preferredSize] || variant.transparentPngDataUrl;
  }

  return variant.sizedPngs[preferredSize] || variant.originalPngDataUrl;
};

export const downloadDataUrl = (filename: string, dataUrl: string) => {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export const downloadSvgMarkup = (filename: string, svgMarkup: string) => {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

export const copyPromptToClipboard = async (prompt: string) => {
  try {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied");
  } catch {
    toast.error("Unable to copy prompt");
  }
};
