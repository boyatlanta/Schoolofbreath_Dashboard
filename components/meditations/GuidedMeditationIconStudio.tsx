import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  GuidedMeditationIconColorMood,
  GuidedMeditationIconStyle,
  GuidedMeditationIconVariant,
  applyVariantToImageField,
  downloadDataUrl,
  downloadSvgMarkup,
  generateGuidedMeditationIconVariants,
  generateGuidedMeditationSvgFromIconPrompt,
  isGuidedMeditationIconAiConfigured,
  suggestGuidedMeditationIconStyleAndMood,
} from "../../services/guidedMeditationIconService";
import { uploadGuidedMeditationPosterFromDataUrl } from "../../services/content";

interface GuidedMeditationIconStudioProps {
  titleSeed: string;
  descriptionSeed?: string;
  uploadCoverToCloud?: boolean;
  onApplyApprovedIcon?: (
    imageDataUrlOrPublicUrl: string,
    variant: GuidedMeditationIconVariant
  ) => void;
  className?: string;
}

const STYLE_OPTIONS: Array<{ value: GuidedMeditationIconStyle; label: string }> = [
  { value: "zen-minimal", label: "Zen Minimal" },
  { value: "sacred-geometry", label: "Sacred Geometry" },
  { value: "nature-flow", label: "Nature Flow" },
];

const COLOR_MOOD_OPTIONS: Array<{
  value: GuidedMeditationIconColorMood;
  label: string;
}> = [
  { value: "deep-teal-gold", label: "Deep Teal + Gold" },
  { value: "mint-sage-cream", label: "Mint + Sage + Cream" },
  { value: "lavender-peach", label: "Lavender + Peach" },
  { value: "healing-balanced", label: "Balanced Healing" },
];

const inputClass =
  "w-full min-w-0 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-deep-teal focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none";
const labelClass =
  "block mb-1.5 text-[10px] font-bold text-teal-primary uppercase tracking-widest";

const compact = (value: string): string => value.replace(/\s+/g, " ").trim();

/** One image model call per Generate (no 3× duplicate requests). */
const AUTO_VARIATION_COUNT = 1;
const AUTO_INCLUDE_SVG = false;
const AUTO_PREFER_TRANSPARENT = true;

export const GuidedMeditationIconStudio: React.FC<
  GuidedMeditationIconStudioProps
> = ({
  titleSeed,
  descriptionSeed = "",
  uploadCoverToCloud = false,
  onApplyApprovedIcon,
  className = "",
}) => {
  const configured = isGuidedMeditationIconAiConfigured();
  const [style, setStyle] = useState<GuidedMeditationIconStyle>("zen-minimal");
  const [colorMood, setColorMood] =
    useState<GuidedMeditationIconColorMood>("deep-teal-gold");
  const [variants, setVariants] = useState<GuidedMeditationIconVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [isSvgLoading, setIsSvgLoading] = useState(false);

  const effectiveTitle = useMemo(
    () => compact(titleSeed) || "Inner Stillness",
    [titleSeed]
  );

  const effectiveDescription = useMemo(
    () => compact(descriptionSeed),
    [descriptionSeed]
  );

  useEffect(() => {
    const { style: nextStyle, colorMood: nextMood } = suggestGuidedMeditationIconStyleAndMood(
      effectiveTitle,
      effectiveDescription || undefined
    );
    setStyle(nextStyle);
    setColorMood(nextMood);
  }, [effectiveTitle, effectiveDescription]);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) || null,
    [variants, selectedVariantId]
  );

  const handleGenerate = async () => {
    if (!configured) {
      toast.error("Set VITE_GOOGLE_AI_API_KEY before generating icons.");
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateGuidedMeditationIconVariants({
        title: effectiveTitle,
        description: effectiveDescription || undefined,
        style,
        colorMood,
        variationCount: AUTO_VARIATION_COUNT,
        includeSvg: AUTO_INCLUDE_SVG,
        forceReferenceReanalysis: false,
      });
      setVariants(generated);
      setSelectedVariantId(generated[0]?.id ?? null);
      toast.success("Icon generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyApproved = async () => {
    if (!selectedVariant) {
      toast.error("Tap an icon to select it first.");
      return;
    }
    const selectedImage = applyVariantToImageField(selectedVariant, {
      preferTransparent: AUTO_PREFER_TRANSPARENT,
      preferredSize: 1024,
    });
    if (!onApplyApprovedIcon) {
      return;
    }

    if (uploadCoverToCloud) {
      setIsSavingCover(true);
      try {
        const safeBase =
          effectiveTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
          "guided";
        const url = await uploadGuidedMeditationPosterFromDataUrl(
          selectedImage,
          `${safeBase}-cover.png`
        );
        onApplyApprovedIcon(url, selectedVariant);
        toast.success("Cover uploaded and applied.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsSavingCover(false);
      }
      return;
    }

    onApplyApprovedIcon(selectedImage, selectedVariant);
    toast.success("Cover applied.");
  };

  const pngBaseFilename = () =>
    `${effectiveTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guided"}-icon`;

  const handleDownloadPng1024 = () => {
    if (!selectedVariant) return;
    const dataUrl =
      selectedVariant.sizedTransparentPngs[1024] || selectedVariant.transparentPngDataUrl;
    downloadDataUrl(`${pngBaseFilename()}-1024.png`, dataUrl);
  };

  const handleDownloadSvg = async () => {
    if (!selectedVariant) return;
    setIsSvgLoading(true);
    try {
      const svg = await generateGuidedMeditationSvgFromIconPrompt(selectedVariant.prompt);
      if (!svg) {
        toast.error("SVG generation returned nothing.");
        return;
      }
      downloadSvgMarkup(`${pngBaseFilename()}.svg`, svg);
      toast.success("SVG downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "SVG generation failed");
    } finally {
      setIsSvgLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/80 p-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-[220px]">
          <label className={labelClass}>Visual Style</label>
          <select
            className={inputClass}
            value={style}
            onChange={(event) =>
              setStyle(event.target.value as GuidedMeditationIconStyle)
            }
            title={STYLE_OPTIONS.find((o) => o.value === style)?.label}
          >
            {STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 flex-1 sm:max-w-[240px]">
          <label className={labelClass}>Color Mood</label>
          <select
            className={inputClass}
            value={colorMood}
            onChange={(event) =>
              setColorMood(event.target.value as GuidedMeditationIconColorMood)
            }
            title={COLOR_MOOD_OPTIONS.find((o) => o.value === colorMood)?.label}
          >
            {COLOR_MOOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !configured}
          className="w-full rounded-xl bg-teal-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50 sm:w-auto sm:shrink-0"
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>

      {variants.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-slate-200/80 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {variants.map((variant, index) => {
                const isSelected = selectedVariantId === variant.id;
                const src = AUTO_PREFER_TRANSPARENT
                  ? variant.sizedTransparentPngs[256]
                  : variant.sizedPngs[256];
                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-label={`Icon option ${index + 1}`}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`rounded-xl border-2 p-0.5 transition ${
                      isSelected
                        ? "border-teal-primary ring-2 ring-teal-primary/30"
                        : "border-transparent hover:border-slate-300"
                    }`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  </button>
                );
              })}
            </div>
            {onApplyApprovedIcon ? (
              <button
                type="button"
                onClick={() => void handleApplyApproved()}
                disabled={!selectedVariant || isSavingCover}
                className="rounded-xl bg-gold px-4 py-2 text-xs font-bold text-deep-teal shadow-sm transition hover:opacity-95 disabled:opacity-50 sm:shrink-0"
              >
                {isSavingCover ? "Uploading..." : "Save cover"}
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPng1024}
              disabled={!selectedVariant}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-deep-teal hover:bg-slate-50 disabled:opacity-50"
            >
              Download PNG (1024)
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadSvg()}
              disabled={!selectedVariant || isSvgLoading}
              className="rounded-lg border border-teal-primary/30 bg-teal-primary/5 px-3 py-1.5 text-xs font-semibold text-teal-primary hover:bg-teal-primary/10 disabled:opacity-50"
            >
              {isSvgLoading ? "Generating SVG..." : "Download SVG"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
