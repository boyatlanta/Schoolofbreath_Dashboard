import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  musicContentService,
  type CategoryType,
  type MusicEntry,
} from "../../services/content";

interface SleepMusicEditModalProps {
  musicId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SleepMusicFormState {
  name: string;
  description: string;
  slug: string;
  position: string;
  imageUrl: string;
  audioUrl: string;
  categoryId: string;
  isPremium: boolean;
}

const SLEEP_KEYWORDS = ["sleep", "sleep-music", "night", "rest"];

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all";
const labelClass =
  "text-xs font-bold text-teal-primary uppercase tracking-widest";

const getDefaultSleepCategoryId = (categories: CategoryType[]): string => {
  const match = categories.find((c) =>
    SLEEP_KEYWORDS.some(
      (keyword) =>
        c.slug?.toLowerCase().includes(keyword) ||
        c.name?.toLowerCase().includes(keyword)
    )
  );
  return match?._id ?? categories[0]?._id ?? "";
};

const getFirstCategoryId = (entry: MusicEntry): string => {
  const firstCategory = entry.categories?.[0];
  if (!firstCategory) return "";
  if (typeof firstCategory === "string") return firstCategory;
  return firstCategory._id || "";
};

const mapEntryToForm = (
  entry: MusicEntry,
  fallbackCategoryId: string
): SleepMusicFormState => ({
  name: entry.name ?? "",
  description: entry.description ?? "",
  slug: entry.slug ?? "",
  position:
    entry.position === undefined || entry.position === null
      ? ""
      : String(entry.position),
  imageUrl: entry.imageFilename ?? "",
  audioUrl: entry.audioFilename ?? "",
  categoryId: getFirstCategoryId(entry) || fallbackCategoryId,
  isPremium: Boolean(entry.isPremium),
});

export const SleepMusicEditModal: React.FC<SleepMusicEditModalProps> = ({
  musicId,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [form, setForm] = useState<SleepMusicFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [musicCategories, entry] = await Promise.all([
          musicContentService.getMusicCategories(),
          musicContentService.getById(musicId),
        ]);
        setCategories(musicCategories);
        const defaultCategoryId = getDefaultSleepCategoryId(musicCategories);
        setForm(mapEntryToForm(entry, defaultCategoryId));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load sleep music"
        );
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [musicId, onClose]);

  const effectiveCategoryId = useMemo(() => {
    if (!form) return "";
    return form.categoryId || getDefaultSleepCategoryId(categories);
  }, [form, categories]);

  const setField = <K extends keyof SleepMusicFormState>(
    key: K,
    value: SleepMusicFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;

    if (!effectiveCategoryId) {
      toast.error("No sleep music category selected.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (!form.audioUrl.trim() || !form.imageUrl.trim()) {
      toast.error("Audio URL and Image URL are required.");
      return;
    }

    const parsedPosition = form.position.trim()
      ? Number.parseInt(form.position, 10)
      : undefined;
    if (
      parsedPosition !== undefined &&
      (Number.isNaN(parsedPosition) || parsedPosition < 0)
    ) {
      toast.error("Position must be a non-negative number.");
      return;
    }

    setIsSaving(true);
    try {
      await musicContentService.update(musicId, {
        name: form.name.trim(),
        description: form.description.trim() || " ",
        slug: form.slug.trim() || undefined,
        position: parsedPosition,
        categories: [effectiveCategoryId],
        isPremium: form.isPremium ? "true" : "false",
        typeContent: "app",
        audioFilename: form.audioUrl.trim(),
        imageFilename: form.imageUrl.trim(),
      });
      toast.success("Sleep music updated successfully");
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
            Edit Sleep Music
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
              onChange={(value) => setField("name", value)}
              placeholder="Deep Sleep Ambient"
              required
            />

            <InputField
              label="Description"
              value={form.description}
              onChange={(value) => setField("description", value)}
              placeholder="Relaxing soundtrack for better sleep"
              as="textarea"
              rows={3}
              required
            />

            <InputField
              label="Slug (optional)"
              value={form.slug}
              onChange={(value) => setField("slug", value)}
              placeholder="deep-sleep-ambient"
            />

            <InputField
              label="Position (optional)"
              value={form.position}
              onChange={(value) => setField("position", value)}
              type="number"
              placeholder="0"
            />

            {categories.length > 0 && (
              <div>
                <label className={`block mb-2 ${labelClass}`}>Category</label>
                <select
                  value={effectiveCategoryId}
                  onChange={(e) => setField("categoryId", e.target.value)}
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <InputField
              label="Image URL"
              value={form.imageUrl}
              onChange={(value) => setField("imageUrl", value)}
              placeholder="https://storage.googleapis.com/.../sleep-cover.png"
              type="url"
              required
            />

            <InputField
              label="Audio URL"
              value={form.audioUrl}
              onChange={(value) => setField("audioUrl", value)}
              placeholder="https://storage.googleapis.com/.../sleep-track.mp3"
              type="url"
              required
            />

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
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
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
