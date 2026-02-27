import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  guidedMeditationsService,
  GUIDED_MEDITATION_CATEGORY_ID,
} from "../../services/content";
import {
  formatDurationLabel,
  getAudioDurationInSeconds,
} from "../../utils/audioDuration";

interface GuidedMeditationEditModalProps {
  meditationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface GuidedMeditationFormState {
  name: string;
  description: string;
  slug: string;
  position: string;
  isPremium: boolean;
  audioFilename: string;
  imageFilename: string;
  duration: number | null;
}

const GUIDED_MEDITATION_CATEGORY_LABEL = "guided meditation";

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all";
const labelClass =
  "text-xs font-bold text-teal-primary uppercase tracking-widest";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const mapEntryToForm = (
  entry: Awaited<ReturnType<typeof guidedMeditationsService.getById>>
): GuidedMeditationFormState => ({
  name: entry.name ?? "",
  description: entry.description ?? "",
  slug: entry.slug ?? "",
  position: String(entry.position ?? 0),
  isPremium: Boolean(entry.isPremium),
  audioFilename: entry.audioFilename ?? "",
  imageFilename: entry.imageFilename ?? "",
  duration:
    typeof entry.duration === "number" &&
    Number.isFinite(entry.duration) &&
    entry.duration > 0
      ? Math.round(entry.duration)
      : null,
});

export const GuidedMeditationEditModal: React.FC<
  GuidedMeditationEditModalProps
> = ({ meditationId, onClose, onSuccess }) => {
  const [form, setForm] = useState<GuidedMeditationFormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [initialAudioUrl, setInitialAudioUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadMeditation = async () => {
      setIsLoading(true);
      try {
        const entry = await guidedMeditationsService.getById(meditationId);
        setForm(mapEntryToForm(entry));
        setInitialAudioUrl(entry.audioFilename ?? "");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load guided meditation"
        );
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    loadMeditation();
  }, [meditationId, onClose]);

  const setField = <K extends keyof GuidedMeditationFormState>(
    key: K,
    value: GuidedMeditationFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleNameChange = (value: string) => {
    setField("name", value);
    if (!slugTouched) {
      setField("slug", slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setField("slug", slugify(value));
  };

  const handleAudioUrlChange = (value: string) => {
    setField("audioFilename", value);
    if (value.trim() !== initialAudioUrl.trim()) {
      setField("duration", null);
    }
  };

  const validateForm = (): form is GuidedMeditationFormState => {
    if (!form) return false;

    if (!form.name.trim()) {
      toast.error("Name is required.");
      return false;
    }
    if (!form.description.trim()) {
      toast.error("Description is required.");
      return false;
    }
    if (!form.slug.trim()) {
      toast.error("Slug is required.");
      return false;
    }
    if (!form.audioFilename.trim()) {
      toast.error("Audio URL is required.");
      return false;
    }
    if (!isValidHttpUrl(form.audioFilename.trim())) {
      toast.error("Please provide a valid audio URL.");
      return false;
    }
    if (form.imageFilename.trim() && !isValidHttpUrl(form.imageFilename.trim())) {
      toast.error("Please provide a valid cover image URL.");
      return false;
    }

    const position = Number.parseInt(form.position, 10);
    if (Number.isNaN(position) || position < 0) {
      toast.error("Position must be a non-negative number.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const audioUrl = form.audioFilename.trim();
      const shouldRefreshDuration =
        audioUrl !== initialAudioUrl.trim() || form.duration === null;
      const duration = shouldRefreshDuration
        ? await getAudioDurationInSeconds(audioUrl)
        : form.duration;

      await guidedMeditationsService.update(meditationId, {
        name: form.name.trim(),
        description: form.description.trim(),
        slug: form.slug.trim(),
        position: Number.parseInt(form.position, 10),
        isPremium: form.isPremium,
        audioFilename: audioUrl,
        imageFilename: form.imageFilename.trim(),
        duration: duration ?? undefined,
      });
      setForm((prev) => (prev ? { ...prev, duration: duration ?? null } : prev));
      setInitialAudioUrl(audioUrl);
      toast.success("Guided meditation updated successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-deep-teal/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <div className="bg-sand/30 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-serif text-2xl font-bold text-deep-teal">
            Edit Guided Meditation
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-all"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLoading || !form ? (
          <div className="p-10 flex justify-center">
            <div className="w-10 h-10 border-4 border-teal-primary/30 border-t-teal-primary rounded-full animate-spin" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar space-y-6"
          >
            <PremiumToggle
              isPremium={form.isPremium}
              onChange={(value) => setField("isPremium", value)}
            />

            <InputField
              label="Name"
              value={form.name}
              onChange={handleNameChange}
              placeholder="Meditation to Manifest Abundance"
              required
            />

            <InputField
              label="Description"
              value={form.description}
              onChange={(value) => setField("description", value)}
              placeholder="Short meditation summary"
              as="textarea"
              rows={3}
              required
            />

            <InputField
              label="Slug"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="meditation-to-manifest-abundance"
              required
            />

            <InputField
              label="Position"
              value={form.position}
              onChange={(value) => setField("position", value)}
              type="number"
              placeholder="0"
              required
            />

            <div>
              <label className={`block mb-2 ${labelClass}`}>Categories</label>
              <select
                className={inputClass}
                value={GUIDED_MEDITATION_CATEGORY_ID}
                disabled
              >
                <option value={GUIDED_MEDITATION_CATEGORY_ID}>
                  {GUIDED_MEDITATION_CATEGORY_LABEL}
                </option>
              </select>
              <p className="text-[11px] text-slate-500 mt-2">
                Fixed default category for guided meditations.
              </p>
            </div>

            <InputField
              label="Cover Image URL (optional)"
              value={form.imageFilename}
              onChange={(value) => setField("imageFilename", value)}
              placeholder="https://storage.googleapis.com/.../Images/Abundance3.png"
              type="url"
            />

            <InputField
              label="Audio URL"
              value={form.audioFilename}
              onChange={handleAudioUrlChange}
              placeholder="https://storage.googleapis.com/.../Meditation-to-Manifest-Abundance.mp3"
              type="url"
              required
            />
            <p className="text-[11px] text-slate-500 -mt-3">
              {form.duration !== null
                ? `Detected duration: ${formatDurationLabel(form.duration)} (${form.duration}s)`
                : "Duration will be calculated automatically from the audio URL when saving."}
            </p>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700 border border-transparent hover:border-slate-200 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-4 bg-teal-primary text-white font-bold rounded-2xl shadow-lg hover:shadow-teal-primary/20 disabled:opacity-50 disabled:translate-y-0 transition-all"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

function PremiumToggle({
  isPremium,
  onChange,
}: {
  isPremium: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <label className={`block mb-2 ${labelClass}`}>Content Type</label>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="radio"
            checked={isPremium}
            onChange={() => onChange(true)}
            className="border-slate-300 text-teal-primary"
          />
          Premium
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="radio"
            checked={!isPremium}
            onChange={() => onChange(false)}
            className="border-slate-300 text-teal-primary"
          />
          Free
        </label>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  as: As = "input",
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  as?: "input" | "textarea";
  rows?: number;
}) {
  const baseProps = {
    required,
    placeholder,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
  };

  return (
    <div>
      <label className={`block mb-2 ${labelClass}`}>{label}</label>
      {As === "textarea" ? (
        <textarea {...baseProps} rows={rows} className={`${inputClass} resize-none`} />
      ) : (
        <input type={type} {...baseProps} className={inputClass} />
      )}
    </div>
  );
}
