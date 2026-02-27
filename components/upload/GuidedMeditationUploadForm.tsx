import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  guidedMeditationsService,
  GUIDED_MEDITATION_CATEGORY_ID,
} from "../../services/content";
import {
  formatDurationLabel,
  getAudioDurationInSeconds,
} from "../../utils/audioDuration";

interface GuidedMeditationUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  description: string;
  slug: string;
  position: string;
  isPremium: boolean;
  audioFilename: string;
  imageFilename: string;
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

export const GuidedMeditationUploadForm: React.FC<
  GuidedMeditationUploadFormProps
> = ({ onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingDuration, setIsDetectingDuration] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [detectedDurationUrl, setDetectedDurationUrl] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    slug: "",
    position: "0",
    isPremium: true,
    audioFilename: "",
    imageFilename: "",
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    setDetectedDuration(null);
    setDetectedDurationUrl("");
  };

  const resolveDuration = async (audioUrl: string): Promise<number> => {
    setIsDetectingDuration(true);
    try {
      const parsedDuration = await getAudioDurationInSeconds(audioUrl);
      setDetectedDuration(parsedDuration);
      setDetectedDurationUrl(audioUrl);
      return parsedDuration;
    } finally {
      setIsDetectingDuration(false);
    }
  };

  const validateForm = (): boolean => {
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

    setIsSubmitting(true);
    try {
      const audioUrl = form.audioFilename.trim();
      const shouldRefreshDuration =
        detectedDuration === null || detectedDurationUrl !== audioUrl;
      const duration = shouldRefreshDuration
        ? await resolveDuration(audioUrl)
        : detectedDuration;

      await guidedMeditationsService.create({
        name: form.name.trim(),
        description: form.description.trim(),
        slug: form.slug.trim(),
        position: Number.parseInt(form.position, 10),
        isPremium: form.isPremium,
        audioFilename: audioUrl,
        imageFilename: form.imageFilename.trim(),
        duration: duration ?? undefined,
      });

      toast.success("Guided meditation created successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        {isDetectingDuration
          ? "Calculating duration from the audio URL..."
          : detectedDuration !== null &&
              detectedDurationUrl === form.audioFilename.trim()
            ? `Detected duration: ${formatDurationLabel(detectedDuration)} (${detectedDuration}s)`
            : "Duration is calculated automatically from the audio URL when saved."}
      </p>

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting || isDetectingDuration}
        submitLabel="Create Guided Meditation"
      />
    </form>
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

function FormActions({
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-4 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700 border border-transparent hover:border-slate-200 rounded-2xl transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 py-4 bg-teal-primary text-white font-bold rounded-2xl shadow-lg hover:shadow-teal-primary/20 disabled:opacity-50 disabled:translate-y-0 transition-all"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
