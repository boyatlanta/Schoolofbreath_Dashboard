import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { optimizeContent } from "../../services/insightsService";
import {
  DEITY_OPTIONS,
  getBenefitOptionsForDeity,
  mantrasService,
} from "../../services/content";
import type { MantraEntry, UpdateMantraPayload } from "../../services/content";

interface MantraEditModalProps {
  mantra: MantraEntry;
  onClose: () => void;
  onSuccess: () => void;
}

interface MantraFormState {
  title: string;
  description: string;
  audioUrl: string;
  thumbnailUrl: string;
  duration: string;
  deity: string;
  benefit: string;
  difficulty: string;
  category: string;
  isPremium: boolean;
  isActive: boolean;
}

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all";
const labelClass = "text-xs font-bold text-teal-primary uppercase tracking-widest";

const mapMantraToFormState = (mantra: MantraEntry): MantraFormState => ({
  deity: mantra.deity || DEITY_OPTIONS[0],
  benefit:
    mantra.benefit ||
    getBenefitOptionsForDeity(mantra.deity || DEITY_OPTIONS[0])[0],
  title: mantra.title ?? "",
  description: mantra.description ?? "",
  audioUrl: mantra.audioUrl ?? "",
  thumbnailUrl: mantra.thumbnailUrl ?? "",
  duration: mantra.duration ? String(mantra.duration) : "",
  difficulty: mantra.difficulty ?? "",
  category: mantra.category ?? "",
  isPremium: Boolean(mantra.isPremium),
  isActive: mantra.isActive !== false,
});

const mapFormStateToPayload = (
  form: MantraFormState,
  duration: number
): UpdateMantraPayload => ({
  title: form.title.trim(),
  description: form.description.trim() || " ",
  audioUrl: form.audioUrl.trim(),
  thumbnailUrl: form.thumbnailUrl.trim() || undefined,
  duration,
  deity: form.deity,
  benefit: form.benefit,
  difficulty: form.difficulty.trim() || undefined,
  category: form.category.trim() || undefined,
  isPremium: form.isPremium,
  isActive: form.isActive,
});

export const MantraEditModal: React.FC<MantraEditModalProps> = ({
  mantra,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<MantraFormState>(() =>
    mapMantraToFormState(mantra)
  );
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const benefitOptions = useMemo(
    () => getBenefitOptionsForDeity(form.deity),
    [form.deity]
  );

  useEffect(() => {
    setForm(mapMantraToFormState(mantra));
  }, [mantra]);

  useEffect(() => {
    if (!benefitOptions.includes(form.benefit)) {
      setForm((prev) => ({ ...prev, benefit: benefitOptions[0] }));
    }
  }, [benefitOptions, form.benefit]);

  const setField = <K extends keyof MantraFormState>(
    key: K,
    value: MantraFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleOptimize = async () => {
    if (!form.title.trim()) {
      toast.error("Please provide a title first.");
      return;
    }
    setIsOptimizing(true);
    try {
      const result = await optimizeContent(form.title, "mantras", []);
      if (result) setField("description", result.description);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please provide a title.");
      return;
    }
    if (!form.audioUrl.trim()) {
      toast.error("Please enter the audio URL.");
      return;
    }
    const durationNum = parseInt(form.duration, 10);
    if (Number.isNaN(durationNum) || durationNum <= 0) {
      toast.error("Please enter a valid duration in seconds.");
      return;
    }

    setIsSaving(true);
    try {
      await mantrasService.update(
        mantra._id,
        mapFormStateToPayload(form, durationNum)
      );
      toast.success("Mantra updated successfully");
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
            Edit Mantra
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-all"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar space-y-6"
        >
          <PremiumActiveToggles
            isPremium={form.isPremium}
            isActive={form.isActive}
            onPremiumChange={(isPremium) => setField("isPremium", isPremium)}
            onActiveChange={(isActive) => setField("isActive", isActive)}
          />

          <InputField
            label="Title"
            value={form.title}
            onChange={(value) => setField("title", value)}
            placeholder="Ex: Om Namah Shivaya"
            required
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={labelClass}>Description</label>
              <button
                type="button"
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="text-[10px] font-bold text-teal-primary bg-teal-primary/5 px-2 py-1 rounded hover:bg-teal-primary/10 disabled:opacity-50"
              >
                {isOptimizing ? "✨ Optimizing..." : "✨ Suggest"}
              </button>
            </div>
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Short catchy description..."
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>

          <InputField
            label="Audio URL"
            type="url"
            value={form.audioUrl}
            onChange={(value) => setField("audioUrl", value)}
            placeholder="https://..."
            required
          />

          <InputField
            label="Thumbnail URL (optional)"
            type="url"
            value={form.thumbnailUrl}
            onChange={(value) => setField("thumbnailUrl", value)}
            placeholder="https://..."
          />

          <InputField
            label="Duration (seconds)"
            type="number"
            value={form.duration}
            onChange={(value) => setField("duration", value)}
            placeholder="e.g. 300"
            min={1}
            required
            helperText="Duration of the mantra in seconds (e.g. 300 = 5 min)"
          />

          <SelectField
            label="Deity"
            value={form.deity}
            options={DEITY_OPTIONS as readonly string[]}
            onChange={(value) => setField("deity", value)}
          />

          <SelectField
            label="Benefit"
            value={form.benefit}
            options={benefitOptions}
            onChange={(value) => setField("benefit", value)}
          />

          <InputField
            label="Category (optional)"
            value={form.category}
            onChange={(value) => setField("category", value)}
            placeholder="Ex: Morning Practice"
          />

          <InputField
            label="Difficulty (optional)"
            value={form.difficulty}
            onChange={(value) => setField("difficulty", value)}
            placeholder="Ex: Beginner"
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
      </div>
    </div>
  );
};

function PremiumActiveToggles({
  isPremium,
  isActive,
  onPremiumChange,
  onActiveChange,
}: {
  isPremium: boolean;
  isActive: boolean;
  onPremiumChange: (value: boolean) => void;
  onActiveChange: (value: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className={`block mb-2 ${labelClass}`}>Content Type</label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={isPremium}
              onChange={() => onPremiumChange(true)}
              className="border-slate-300 text-teal-primary"
            />
            Premium
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={!isPremium}
              onChange={() => onPremiumChange(false)}
              className="border-slate-300 text-teal-primary"
            />
            Free
          </label>
        </div>
      </div>
      <div>
        <label className={`block mb-2 ${labelClass}`}>Status</label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={isActive}
              onChange={() => onActiveChange(true)}
              className="border-slate-300 text-teal-primary"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={!isActive}
              onChange={() => onActiveChange(false)}
              className="border-slate-300 text-teal-primary"
            />
            Draft
          </label>
        </div>
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
  helperText,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  helperText?: string;
  min?: number;
}) {
  return (
    <div>
      <label className={`block mb-2 ${labelClass}`}>{label}</label>
      <input
        type={type}
        required={required}
        min={min}
        className={inputClass}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {helperText ? (
        <p className="text-[10px] text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={`block mb-2 ${labelClass}`}>{label}</label>
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
