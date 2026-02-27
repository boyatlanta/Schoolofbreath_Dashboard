/**
 * Mantra upload form – /mantras API (audioUrl, deity, benefit, duration)
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  mantrasService,
  DEITY_OPTIONS,
  getBenefitOptionsForDeity,
} from "../../services/content";
import { suggestMantraContent } from "../../services/insightsService";
import { toast } from "react-toastify";

interface MantraUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all";
const labelClass = "text-xs font-bold text-teal-primary uppercase tracking-widest";

export const MantraUploadForm: React.FC<MantraUploadFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [deity, setDeity] = useState(DEITY_OPTIONS[0]);
  const [benefit, setBenefit] = useState(getBenefitOptionsForDeity(DEITY_OPTIONS[0])[0]);
  const [isPremium, setIsPremium] = useState(false);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [isSuggestingDescription, setIsSuggestingDescription] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const benefitOptions = useMemo(() => getBenefitOptionsForDeity(deity), [deity]);

  useEffect(() => {
    if (!benefitOptions.includes(benefit)) {
      setBenefit(benefitOptions[0]);
    }
  }, [benefit, benefitOptions]);

  const handleSuggestTitle = async () => {
    setIsSuggestingTitle(true);
    try {
      const result = await suggestMantraContent({
        title,
        deity,
        benefit,
        mode: "title",
      });
      if (result?.title) {
        setTitle(result.title);
      }
      if (!description && result?.description) {
        setDescription(result.description);
      }
    } catch {
      toast.error("Unable to generate title suggestion right now.");
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  const handleSuggestDescription = async () => {
    setIsSuggestingDescription(true);
    try {
      const result = await suggestMantraContent({
        title,
        deity,
        benefit,
        mode: "description",
      });
      if (result?.description) {
        setDescription(result.description);
      }
      if (!title && result?.title) {
        setTitle(result.title);
      }
    } catch {
      toast.error("Unable to generate description suggestion right now.");
    } finally {
      setIsSuggestingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioUrl?.trim()) {
      toast.error("Please enter the audio URL.");
      return;
    }
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast.error("Please enter a valid duration in seconds.");
      return;
    }
    setIsUploading(true);
    try {
      await mantrasService.create({
        title,
        description: description || " ",
        audioUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        duration: durationNum,
        deity,
        benefit,
        isPremium,
        isActive: true,
      });
      toast.success("Mantra uploaded successfully");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PremiumToggle value={isPremium} onChange={setIsPremium} labelClass={labelClass} />
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className={labelClass}>Title</label>
          <button
            type="button"
            onClick={handleSuggestTitle}
            disabled={isSuggestingTitle}
            className="text-[10px] font-bold text-teal-primary bg-teal-primary/5 px-2 py-1 rounded hover:bg-teal-primary/10 disabled:opacity-50"
          >
            {isSuggestingTitle ? "✨ Generating..." : "✨ Suggest Title"}
          </button>
        </div>
        <input
          type="text"
          required
          className={inputClass}
          placeholder="Ex: Om Namah Shivaya"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className={labelClass}>Description</label>
          <button
            type="button"
            onClick={handleSuggestDescription}
            disabled={isSuggestingDescription}
            className="text-[10px] font-bold text-teal-primary bg-teal-primary/5 px-2 py-1 rounded hover:bg-teal-primary/10 disabled:opacity-50"
          >
            {isSuggestingDescription ? "✨ Generating..." : "✨ Suggest Description"}
          </button>
        </div>
        <textarea
          rows={2}
          className={`${inputClass} resize-none`}
          placeholder="Short catchy description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <InputField label="Audio URL" type="url" value={audioUrl} onChange={setAudioUrl} placeholder="https://..." required />
      <InputField label="Thumbnail URL (optional)" type="url" value={thumbnailUrl} onChange={setThumbnailUrl} placeholder="https://..." />
      <div>
        <label className={`block mb-2 ${labelClass}`}>Duration (seconds)</label>
        <input
          type="number"
          min={1}
          required
          className={inputClass}
          placeholder="e.g. 300"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <p className="text-[10px] text-slate-400 mt-1">Duration of the mantra in seconds (e.g. 300 = 5 min)</p>
      </div>
      <div>
        <label className={`block mb-2 ${labelClass}`}>Deity</label>
        <select
          className={inputClass}
          value={deity}
          onChange={(e) => setDeity(e.target.value)}
        >
          {DEITY_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={`block mb-2 ${labelClass}`}>Benefit</label>
        <select
          className={inputClass}
          value={benefit}
          onChange={(e) => setBenefit(e.target.value)}
        >
          {benefitOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <FormActions onCancel={onCancel} submitLabel="Upload Mantra" isSubmitting={isUploading} />
    </form>
  );
};

function PremiumToggle({
  value,
  onChange,
  labelClass,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  labelClass: string;
}) {
  return (
    <div>
      <label className={`block mb-2 ${labelClass}`}>Content Type</label>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="radio" checked={value} onChange={() => onChange(true)} className="border-slate-300 text-teal-primary" />
          Premium
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="radio" checked={!value} onChange={() => onChange(false)} className="border-slate-300 text-teal-primary" />
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={`block mb-2 ${labelClass}`}>{label}</label>
      <input
        type={type}
        required={required}
        className={inputClass}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
