/**
 * PlaylistsPage – Admin view for managing curated mantra playlists.
 * Lists all playlists, allows create/edit/delete, and inline track management.
 */
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Music2, Loader2 } from "lucide-react";
import { playlistsService } from "../../services/content/playlistsService";
import type { PlaylistEntry } from "../../services/content/playlistsService";
import { PlaylistEditModal } from "./PlaylistEditModal";

const formatDuration = (minutes: number) =>
  minutes > 0 ? `${minutes} min` : "--";

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? "--" : d.toLocaleDateString();
};

export const PlaylistsPage: React.FC = () => {
  const [playlists, setPlaylists] = useState<PlaylistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<PlaylistEntry | null | "new">(undefined as unknown as null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await playlistsService.getAll(true);
      setPlaylists(data);
    } catch {
      toast.error("Failed to load playlists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (playlist: PlaylistEntry) => {
    setEditTarget(playlist);
    setModalOpen(true);
  };

  const handleSaved = (saved: PlaylistEntry) => {
    setPlaylists((prev) => {
      const idx = prev.findIndex((p) => p._id === saved._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setModalOpen(false);
  };

  const handleDelete = async (playlist: PlaylistEntry) => {
    if (!window.confirm(`Delete "${playlist.name}"? This cannot be undone.`)) return;
    setDeleting(playlist._id);
    try {
      await playlistsService.delete(playlist._id);
      setPlaylists((prev) => prev.filter((p) => p._id !== playlist._id));
      toast.success("Playlist deleted");
    } catch {
      toast.error("Failed to delete playlist");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (playlist: PlaylistEntry) => {
    setToggling(playlist._id);
    try {
      const updated = await playlistsService.update(playlist._id, {
        isActive: !playlist.isActive,
      });
      setPlaylists((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      );
      toast.success(`Playlist ${updated.isActive ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to toggle status");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-deep-teal">Mantra Playlists</h1>
          <p className="text-slate-500 font-medium mt-1">
            Curated playlists served to all users via the API
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-primary text-white text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <Plus size={16} />
          New Playlist
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: playlists.length },
          { label: "Active", value: playlists.filter((p) => p.isActive).length },
          { label: "Public", value: playlists.filter((p) => p.isPublic).length },
          {
            label: "Total Tracks",
            value: playlists.reduce((sum, p) => sum + (p.trackIds?.length ?? 0), 0),
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300"
          >
            <p className="font-serif text-3xl font-bold text-deep-teal">{s.value}</p>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Playlist Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-primary/30 border-t-teal-primary rounded-full animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-20 text-center">
          <Music2 size={48} className="text-slate-300 mb-4" />
          <h3 className="font-serif text-xl font-bold text-slate-400 mb-2">No playlists yet</h3>
          <p className="text-slate-400 max-w-sm mb-6">Create your first curated playlist to get started.</p>
          <button
            onClick={openCreate}
            className="px-8 py-3 bg-teal-primary/10 text-teal-primary font-bold rounded-xl hover:bg-teal-primary hover:text-white transition-all"
          >
            Create First Playlist
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-sand/30 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">
                    Playlist
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary hidden sm:table-cell">
                    Tracks
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary hidden md:table-cell">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary hidden lg:table-cell">
                    Plays
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary hidden lg:table-cell">
                    Created
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {playlists.map((pl) => (
                  <tr key={pl._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl shrink-0 shadow-inner flex items-center justify-center"
                          style={{ backgroundColor: pl.accentColor || "#2a5f73" }}
                        >
                          <Music2 size={18} className="text-white/80" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate max-w-[180px]">
                            {pl.name}
                          </p>
                          {pl.description && (
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">
                              {pl.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 hidden sm:table-cell">
                      {pl.trackIds?.length ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell">
                      {formatDuration(pl.totalDuration)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden lg:table-cell">
                      {pl.playCount ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden lg:table-cell">
                      {formatDate(pl.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {toggling === pl._id ? (
                        <Loader2 size={18} className="animate-spin text-teal-primary" />
                      ) : (
                        <>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                              pl.isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {pl.isActive ? "Active" : "Draft"}
                          </span>
                          <button
                            onClick={() => handleToggleActive(pl)}
                            className="ml-2 text-xs text-teal-primary hover:underline font-medium"
                            title={pl.isActive ? "Deactivate" : "Activate"}
                          >
                            Toggle
                          </button>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(pl)}
                          className="p-2 rounded-lg hover:bg-teal-primary/10 text-slate-400 hover:text-teal-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(pl)}
                          disabled={deleting === pl._id}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          {deleting === pl._id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <PlaylistEditModal
          playlist={editTarget ?? null}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
