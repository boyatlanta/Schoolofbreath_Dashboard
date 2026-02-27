/**
 * Music upload form – Sleep Music, Meditation, Chakra
 * Shared backend: /musics with category selection
 */
import React, { useState, useEffect } from "react";
import { musicContentService, type CategoryType } from "../../services/content";
import { toast } from "react-toastify";

interface MusicUploadFormProps {
  category: "sleep-music" | "meditation" | "chakra";
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "sleep-music": ["sleep", "sleep-music", "Sleep Music"],
  meditation: ["meditation", "guided", "Meditation"],
  chakra: ["chakra", "shakra", "Chakra", "Chakra Music"],
};

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all";
const labelClass = "text-xs font-bold text-teal-primary uppercase tracking-widest";

export const MusicUploadForm: React.FC<MusicUploadFormProps> = ({
  category,
  onSuccess,
  onCancel,
}) => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    musicContentService
      .getMusicCategories()
      .then(setCategories)
      .catch(() => toast.error("Failed to load categories"));
  }, []);

  const defaultCategoryId = (() => {
    const kw = CATEGORY_KEYWORDS[category] ?? [];
    const match = categories.find((c) =>
      kw.some(
        (k) =>
          c.slug?.toLowerCase().includes(k.toLowerCase()) ||
          c.name?.toLowerCase().includes(k.toLowerCase())
      )
    );
    return match?._id ?? categories[0]?._id ?? "";
  })();

  const effectiveCategoryId = categoryId || defaultCategoryId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCategoryId) {
      toast.error("No matching category found. Add categories in the backend.");
      return;
    }
    if (!audioUrl?.trim() || !imageUrl?.trim()) {
      toast.error("Please enter image and audio URLs.");
      return;
    }
    setIsUploading(true);
    try {
      // Sleep Music, Meditation, Chakra all use typeContent 'app' so they appear in the app
      // (GET /app/musics/category and /app/musics/preview only return typeContent: 'app')
      await musicContentService.create({
        name,
        description: description || " ",
        categories: effectiveCategoryId,
        isPremium: isPremium ? "true" : "false",
        typeContent: "app",
        audioFilename: audioUrl,
        imageFilename: imageUrl,
      });
      toast.success("Content uploaded successfully");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className={`block mb-2 ${labelClass}`}>Content Type</label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="radio" checked={isPremium} onChange={() => setIsPremium(true)} className="border-slate-300 text-teal-primary" />
            Premium
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="radio" checked={!isPremium} onChange={() => setIsPremium(false)} className="border-slate-300 text-teal-primary" />
            Free
          </label>
        </div>
      </div>
      <InputField label="Name" value={name} onChange={setName} placeholder="Enter music name" required />
      <InputField
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="Enter music description"
        as="textarea"
        rows={3}
        required
      />
      {categories.length > 0 && (
        <div>
          <label className={`block mb-2 ${labelClass}`}>Category</label>
          <select
            className={inputClass}
            value={effectiveCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <InputField label="Image URL" type="url" value={imageUrl} onChange={setImageUrl} placeholder="Enter image url" required />
      <InputField label="Audio URL" type="url" value={audioUrl} onChange={setAudioUrl} placeholder="Enter audio url" required />
      <FormActions onCancel={onCancel} submitLabel="Upload" isSubmitting={isUploading} />
    </form>
  );
};

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
  onChange: (v: string) => void;
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
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
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
  submitLabel,
  isSubmitting,
}: {
  onCancel: () => void;
  submitLabel: string;
  isSubmitting: boolean;
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
