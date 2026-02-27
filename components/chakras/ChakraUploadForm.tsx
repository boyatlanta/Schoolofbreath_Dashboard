import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { musicContentService, type CategoryType } from "../../services/content";

interface ChakraUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
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

export const ChakraUploadForm: React.FC<ChakraUploadFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<ChakraFormState>({
    name: "",
    description: "",
    imageUrl: "",
    audioUrl: "",
    visualUrl: "",
    categoryId: "",
    isPremium: true,
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const musicCategories = await musicContentService.getMusicCategories();
        setCategories(musicCategories);
        setForm((prev) => ({
          ...prev,
          categoryId: prev.categoryId || getDefaultChakraCategoryId(musicCategories),
        }));
      } catch {
        toast.error("Failed to load categories");
      }
    };

    loadCategories();
  }, []);

  const effectiveCategoryId = useMemo(
    () => form.categoryId || getDefaultChakraCategoryId(categories),
    [form.categoryId, categories]
  );

  const setField = <K extends keyof ChakraFormState>(
    key: K,
    value: ChakraFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveCategoryId) {
      toast.error("No chakra category found. Create it in backend first.");
      return;
    }
    if (!form.audioUrl.trim() || !form.imageUrl.trim()) {
      toast.error("Audio URL and Image URL are required.");
      return;
    }

    setIsUploading(true);
    try {
      await musicContentService.create({
        name: form.name.trim(),
        description: form.description.trim() || " ",
        categories: [effectiveCategoryId],
        isPremium: form.isPremium ? "true" : "false",
        typeContent: "app",
        audioFilename: form.audioUrl.trim(),
        imageFilename: form.imageUrl.trim(),
        visualUrl: form.visualUrl.trim() || undefined,
      });
      toast.success("Chakra uploaded successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
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
        placeholder="https://storage.googleapis.com/.../crown.png"
        type="url"
        required
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
        label="Visual URL (optional)"
        value={form.visualUrl}
        onChange={(value) => setField("visualUrl", value)}
        placeholder="https://storage.googleapis.com/.../crown.mp4"
        type="url"
      />

      <FormActions
        onCancel={onCancel}
        isSubmitting={isUploading}
        submitLabel="Upload Chakra"
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
        {isSubmitting ? "Uploading..." : submitLabel}
      </button>
    </div>
  );
}
