import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  musicContentService,
  type CategoryType,
  type MusicEntry,
} from "../../services/content";

interface ChakraEditModalProps {
  chakraId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ChakraFormState {
  name: string;
  description: string;
  imageUrl: string;
  audioUrl: string;
  visualUrl: string;
  categoryId: string;
  isPremium: boolean;
}

const CHAKRA_KEYWORDS = ["chakra", "shakra", "crown", "root", "sacral"];

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all";
const labelClass =
  "text-xs font-bold text-teal-primary uppercase tracking-widest";

const getDefaultChakraCategoryId = (categories: CategoryType[]): string => {
  const match = categories.find((c) =>
    CHAKRA_KEYWORDS.some(
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
): ChakraFormState => ({
  name: entry.name ?? "",
  description: entry.description ?? "",
  imageUrl: entry.imageFilename ?? "",
  audioUrl: entry.audioFilename ?? "",
  visualUrl: entry.visualUrl ?? "",
  categoryId: getFirstCategoryId(entry) || fallbackCategoryId,
  isPremium: Boolean(entry.isPremium),
});

export const ChakraEditModal: React.FC<ChakraEditModalProps> = ({
  chakraId,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [form, setForm] = useState<ChakraFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [musicCategories, entry] = await Promise.all([
          musicContentService.getMusicCategories(),
          musicContentService.getById(chakraId),
        ]);
        setCategories(musicCategories);
        const defaultCategoryId = getDefaultChakraCategoryId(musicCategories);
        setForm(mapEntryToForm(entry, defaultCategoryId));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load chakra"
        );
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [chakraId]);

  const effectiveCategoryId = useMemo(() => {
    if (!form) return "";
    return form.categoryId || getDefaultChakraCategoryId(categories);
  }, [form, categories]);

  const setField = <K extends keyof ChakraFormState>(
    key: K,
    value: ChakraFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!effectiveCategoryId) {
      toast.error("No chakra category found. Create it in backend first.");
      return;
    }
    if (!form.audioUrl.trim() || !form.visualUrl.trim()) {
      toast.error("Audio URL and Visual URL are required.");
      return;
    }

    setIsSaving(true);
    try {
      await musicContentService.update(chakraId, {
        name: form.name.trim(),
        description: form.description.trim() || " ",
        categories: [effectiveCategoryId],
        isPremium: form.isPremium ? "true" : "false",
        typeContent: "app",
        audioFilename: form.audioUrl.trim(),
        imageFilename: form.imageUrl.trim() || undefined,
        visualUrl: form.visualUrl.trim(),
      });
      toast.success("Chakra updated successfully");
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
            Edit Chakra
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
              placeholder="Crown Healing"
              required
            />

            <InputField
              label="Description"
              value={form.description}
              onChange={(value) => setField("description", value)}
              placeholder="Crown Healing sounds"
              as="textarea"
              rows={3}
              required
            />

            <InputField
              label="Image URL (optional)"
              value={form.imageUrl}
              onChange={(value) => setField("imageUrl", value)}
              placeholder="https://storage.googleapis.com/.../crown.png"
              type="url"
            />

            <InputField
              label="Audio URL"
              value={form.audioUrl}
              onChange={(value) => setField("audioUrl", value)}
              placeholder="https://storage.googleapis.com/.../crown.mp3"
              type="url"
              required
            />

            <InputField
              label="Visual URL"
              value={form.visualUrl}
              onChange={(value) => setField("visualUrl", value)}
              placeholder="https://storage.googleapis.com/.../crown.mp4"
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
