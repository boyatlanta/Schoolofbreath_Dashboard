/**
 * PlaylistEditModal – Create or edit a curated mantra playlist.
 * Supports manual track selection, inline mantra creation, and AI auto-generation.
 */
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { X, Sparkles, Plus, Trash2, GripVertical, Loader2, PenLine, Search } from "lucide-react";
import { playlistsService } from "../../services/content/playlistsService";
import type {
  PlaylistEntry,
  CreatePlaylistPayload,
  UpdatePlaylistPayload,
} from "../../services/content/playlistsService";
import { mantrasService, DEITY_OPTIONS, getBenefitOptionsForDeity } from "../../services/content";
import type { MantraEntry } from "../../services/content/mantrasService";
import { suggestMantraContent } from "../../services/insightsService";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  "#1a4d5e", "#2a5f73", "#3a7a92", "#8ba888", "#c9a868",
  "#b4d9cc", "#d4c5e2", "#f5cba7",
];

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all text-sm";
const labelClass = "block text-xs font-bold text-teal-primary uppercase tracking-widest mb-1";

// ─── Playlist form ─────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  coverImage: string;
  accentColor: string;
  tags: string;
  isPublic: boolean;
  isActive: boolean;
  trackIds: string[];
}

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  coverImage: "",
  accentColor: ACCENT_COLORS[0],
  tags: "",
  isPublic: true,
  isActive: true,
  trackIds: [],
});

const playlistToForm = (p: PlaylistEntry): FormState => ({
  name: p.name,
  description: p.description ?? "",
  coverImage: p.coverImage ?? "",
  accentColor: p.accentColor ?? ACCENT_COLORS[0],
  tags: (p.tags ?? []).join(", "),
  isPublic: p.isPublic,
  isActive: p.isActive,
  trackIds: p.trackIds ?? [],
});

// ─── New-mantra inline form state ─────────────────────────────────────────────

interface NewMantraForm {
  title: string;
  description: string;
  audioUrl: string;
  thumbnailUrl: string;
  duration: string;
  deity: string;
  benefit: string;
  isPremium: boolean;
}

const emptyMantraForm = (): NewMantraForm => ({
  title: "",
  description: "",
  audioUrl: "",
  thumbnailUrl: "",
  duration: "",
  deity: DEITY_OPTIONS[0],
  benefit: getBenefitOptionsForDeity(DEITY_OPTIONS[0])[0],
  isPremium: false,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  playlist: PlaylistEntry | null; // null = creating new
  onClose: () => void;
  onSaved: (playlist: PlaylistEntry) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PlaylistEditModal: React.FC<Props> = ({ playlist, onClose, onSaved }) => {
  const isEditing = !!playlist;

  // Playlist form
  const [form, setForm] = useState<FormState>(playlist ? playlistToForm(playlist) : emptyForm());
  const [saving, setSaving] = useState(false);

  // Tracks
  const [allMantras, setAllMantras] = useState<MantraEntry[]>([]);
  const [loadingMantras, setLoadingMantras] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // AI generation
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCount, setAiCount] = useState(6);

  // Inline new-mantra form
  const [trackTab, setTrackTab] = useState<"search" | "create">("search");
  const [newMantra, setNewMantra] = useState<NewMantraForm>(emptyMantraForm());
  const [creatingMantra, setCreatingMantra] = useState(false);
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const [suggestingDesc, setSuggestingDesc] = useState(false);

  const benefitOptions = useMemo(() => getBenefitOptionsForDeity(newMantra.deity), [newMantra.deity]);

  // Reset benefit when deity changes
  useEffect(() => {
    if (!benefitOptions.includes(newMantra.benefit)) {
      setNewMantra((p) => ({ ...p, benefit: benefitOptions[0] }));
    }
  }, [benefitOptions, newMantra.benefit]);

  // Load all mantras once
  useEffect(() => {
    setLoadingMantras(true);
    mantrasService
      .getAll()
      .then(setAllMantras)
      .catch(() => toast.error("Failed to load mantras"))
      .finally(() => setLoadingMantras(false));
  }, []);

  const mantraById = new Map(allMantras.map((m) => [m._id, m]));

  const selectedTracks = form.trackIds
    .map((id) => mantraById.get(id))
    .filter(Boolean) as MantraEntry[];

  const availableTracks = allMantras.filter(
    (m) =>
      !form.trackIds.includes(m._id) &&
      (trackSearch === "" ||
        m.title.toLowerCase().includes(trackSearch.toLowerCase()) ||
        m.deity?.toLowerCase().includes(trackSearch.toLowerCase()) ||
        m.benefit?.toLowerCase().includes(trackSearch.toLowerCase()))
  );

  // ── Playlist handlers ────────────────────────────────────────────────────

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleAddTrack = (mantraId: string) => {
    setForm((f) => ({ ...f, trackIds: [...f.trackIds, mantraId] }));
  };

  const handleRemoveTrack = (mantraId: string) => {
    setForm((f) => ({ ...f, trackIds: f.trackIds.filter((id) => id !== mantraId) }));
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...form.trackIds];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setForm((f) => ({ ...f, trackIds: next }));
    setDragIndex(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Playlist name is required");
      return;
    }
    setSaving(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const payload: CreatePlaylistPayload & UpdatePlaylistPayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        coverImage: form.coverImage.trim(),
        accentColor: form.accentColor,
        tags,
        isPublic: form.isPublic,
        isActive: form.isActive,
        trackIds: form.trackIds,
      };
      const saved = isEditing
        ? await playlistsService.update(playlist!._id, payload)
        : await playlistsService.create(payload);
      toast.success(isEditing ? "Playlist updated" : "Playlist created");
      onSaved(saved);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!isEditing) {
      toast.info("Save the playlist first, then use AI to generate tracks.");
      return;
    }
    setAiGenerating(true);
    try {
      const result = await playlistsService.aiGenerateTracks(playlist!._id, aiCount);
      setForm((f) => ({ ...f, trackIds: result.selectedIds }));
      toast.success(`AI selected ${result.selectedIds.length} tracks`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Inline new-mantra handlers ────────────────────────────────────────────

  const setNM = <K extends keyof NewMantraForm>(key: K, value: NewMantraForm[K]) =>
    setNewMantra((p) => ({ ...p, [key]: value }));

  const handleSuggestTitle = async () => {
    setSuggestingTitle(true);
    try {
      const result = await suggestMantraContent({ title: newMantra.title, deity: newMantra.deity, benefit: newMantra.benefit, mode: "title" });
      if (result?.title) setNM("title", result.title);
      if (!newMantra.description && result?.description) setNM("description", result.description);
    } catch {
      toast.error("Unable to generate title suggestion.");
    } finally {
      setSuggestingTitle(false);
    }
  };

  const handleSuggestDesc = async () => {
    setSuggestingDesc(true);
    try {
      const result = await suggestMantraContent({ title: newMantra.title, deity: newMantra.deity, benefit: newMantra.benefit, mode: "description" });
      if (result?.description) setNM("description", result.description);
      if (!newMantra.title && result?.title) setNM("title", result.title);
    } catch {
      toast.error("Unable to generate description suggestion.");
    } finally {
      setSuggestingDesc(false);
    }
  };

  const handleCreateMantra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMantra.title.trim()) { toast.error("Title is required"); return; }
    if (!newMantra.audioUrl.trim()) { toast.error("Audio URL is required"); return; }
    const durationNum = parseInt(newMantra.duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) { toast.error("Enter a valid duration in seconds"); return; }

    setCreatingMantra(true);
    try {
      const created = await mantrasService.create({
        title: newMantra.title.trim(),
        description: newMantra.description.trim() || " ",
        audioUrl: newMantra.audioUrl.trim(),
        thumbnailUrl: newMantra.thumbnailUrl.trim() || undefined,
        duration: durationNum,
        deity: newMantra.deity,
        benefit: newMantra.benefit,
        isPremium: newMantra.isPremium,
        isActive: true,
      });
      // Add the new mantra to the local mantra list and to the playlist
      setAllMantras((prev) => [...prev, created]);
      setForm((f) => ({ ...f, trackIds: [...f.trackIds, created._id] }));
      setNewMantra(emptyMantraForm());
      setTrackTab("search");
      toast.success(`"${created.title}" created and added to playlist`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create mantra");
    } finally {
      setCreatingMantra(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-modal-title"
    >
      <div
        className="absolute inset-0 bg-deep-teal/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col">
        {/* Header */}
        <div className="bg-sand/30 px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 id="playlist-modal-title" className="font-serif text-2xl font-bold text-deep-teal">
            {isEditing ? "Edit Playlist" : "New Playlist"}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* ── Playlist basic info ───────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Playlist Name *</label>
              <input value={form.name} onChange={set("name")} placeholder="e.g. Morning Sadhana" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Cover Image URL</label>
              <input value={form.coverImage} onChange={set("coverImage")} placeholder="https://..." className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea value={form.description} onChange={set("description")} rows={2} placeholder="Short description for users…" className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input value={form.tags} onChange={set("tags")} placeholder="sleep, morning, yoga" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Accent Color</label>
              <div className="flex gap-2 flex-wrap">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, accentColor: c }))}
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 shadow-inner"
                    style={{ backgroundColor: c, borderColor: form.accentColor === c ? "#1a4d5e" : "transparent" }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))} className="border-slate-300 text-teal-primary rounded focus:ring-teal-primary" />
                <span className="text-sm font-medium text-slate-700">Public</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="border-slate-300 text-teal-primary rounded focus:ring-teal-primary" />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>

          {/* ── Tracks section ────────────────────────────────────────── */}
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-deep-teal uppercase tracking-widest">
                Tracks ({selectedTracks.length})
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value) || 6)}
                  className="w-14 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 text-center focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
                  title="Track count for AI"
                />
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !isEditing}
                  title={!isEditing ? "Save first to enable AI generation" : "AI auto-generate tracks"}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-primary/10 text-teal-primary text-xs font-bold hover:bg-teal-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  AI Generate
                </button>
              </div>
            </div>

            {/* Selected / ordered tracks */}
            {selectedTracks.length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedTracks.map((m, i) => (
                  <div
                    key={m._id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(i)}
                    className="flex items-center gap-3 rounded-xl bg-sand/30 border border-slate-100 px-4 py-3 cursor-grab active:cursor-grabbing hover:bg-sand/50 transition-colors"
                  >
                    <GripVertical size={16} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-teal-primary w-6 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{m.title}</p>
                      <p className="text-xs text-slate-500">{m.deity} · {m.benefit}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(m._id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab switcher: Search existing vs Create new */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="flex border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setTrackTab("search")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors ${
                    trackTab === "search"
                      ? "bg-teal-primary text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Search size={13} />
                  Search Existing
                </button>
                <button
                  type="button"
                  onClick={() => setTrackTab("create")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors ${
                    trackTab === "create"
                      ? "bg-teal-primary text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <PenLine size={13} />
                  Create New Mantra
                </button>
              </div>

              {/* ── Search tab ───────────────────────────────────────── */}
              {trackTab === "search" && (
                <>
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <input
                      value={trackSearch}
                      onChange={(e) => setTrackSearch(e.target.value)}
                      placeholder="Search by title, deity, benefit…"
                      className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {loadingMantras ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-teal-primary/30 border-t-teal-primary rounded-full animate-spin" />
                      </div>
                    ) : availableTracks.length === 0 ? (
                      <p className="text-center text-sm text-slate-400 py-6">
                        {trackSearch ? "No results" : "All mantras already added"}
                      </p>
                    ) : (
                      availableTracks.slice(0, 40).map((m) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => handleAddTrack(m._id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-primary/5 transition-colors text-left border-b border-slate-50 last:border-0"
                        >
                          <Plus size={14} className="text-teal-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                            <p className="text-xs text-slate-500">{m.deity} · {m.benefit}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ── Create new mantra tab ────────────────────────────── */}
              {trackTab === "create" && (
                <form onSubmit={handleCreateMantra} className="p-5 space-y-4 max-h-[420px] overflow-y-auto">
                  {/* Content type */}
                  <div>
                    <label className={labelClass}>Content Type</label>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="radio" checked={newMantra.isPremium} onChange={() => setNM("isPremium", true)} className="text-teal-primary" />
                        Premium
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="radio" checked={!newMantra.isPremium} onChange={() => setNM("isPremium", false)} className="text-teal-primary" />
                        Free
                      </label>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelClass}>Title *</label>
                      <button
                        type="button"
                        onClick={handleSuggestTitle}
                        disabled={suggestingTitle}
                        className="text-[10px] font-bold text-teal-primary bg-teal-primary/5 px-2 py-1 rounded hover:bg-teal-primary/10 disabled:opacity-50"
                      >
                        {suggestingTitle ? "✨ Generating..." : "✨ Suggest"}
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newMantra.title}
                      onChange={(e) => setNM("title", e.target.value)}
                      placeholder="e.g. Om Namah Shivaya"
                      className={inputClass}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelClass}>Description</label>
                      <button
                        type="button"
                        onClick={handleSuggestDesc}
                        disabled={suggestingDesc}
                        className="text-[10px] font-bold text-teal-primary bg-teal-primary/5 px-2 py-1 rounded hover:bg-teal-primary/10 disabled:opacity-50"
                      >
                        {suggestingDesc ? "✨ Generating..." : "✨ Suggest"}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={newMantra.description}
                      onChange={(e) => setNM("description", e.target.value)}
                      placeholder="Short catchy description…"
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  {/* Audio URL */}
                  <div>
                    <label className={labelClass}>Audio URL *</label>
                    <input
                      type="url"
                      required
                      value={newMantra.audioUrl}
                      onChange={(e) => setNM("audioUrl", e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>

                  {/* Thumbnail URL */}
                  <div>
                    <label className={labelClass}>Thumbnail URL (optional)</label>
                    <input
                      type="url"
                      value={newMantra.thumbnailUrl}
                      onChange={(e) => setNM("thumbnailUrl", e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className={labelClass}>Duration (seconds) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newMantra.duration}
                      onChange={(e) => setNM("duration", e.target.value)}
                      placeholder="e.g. 300"
                      className={inputClass}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">e.g. 300 = 5 min</p>
                  </div>

                  {/* Deity */}
                  <div>
                    <label className={labelClass}>Deity</label>
                    <select
                      value={newMantra.deity}
                      onChange={(e) => setNM("deity", e.target.value)}
                      className={inputClass}
                    >
                      {DEITY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Benefit */}
                  <div>
                    <label className={labelClass}>Benefit</label>
                    <select
                      value={newMantra.benefit}
                      onChange={(e) => setNM("benefit", e.target.value)}
                      className={inputClass}
                    >
                      {benefitOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={creatingMantra}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-teal-primary text-white text-sm font-bold rounded-xl shadow-md hover:shadow-teal-primary/20 disabled:opacity-50 transition-all"
                  >
                    {creatingMantra ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {creatingMantra ? "Creating…" : "Create & Add to Playlist"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-primary text-white text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? "Save Changes" : "Create Playlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
