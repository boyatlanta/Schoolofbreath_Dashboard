import React, { useState, useEffect, useMemo } from 'react';
import { Category, ContentItem } from '../types';
import { musicContentService, mantrasService } from '../services/content';
import type { MusicEntry } from '../services/content';
import type { MantraEntry } from '../services/content';
import { toast } from 'react-toastify';
import { MantraEditModal } from './mantras/MantraEditModal';
import { ChakraEditModal } from './chakras/ChakraEditModal';
import { GuidedMeditationEditModal } from './meditations/GuidedMeditationEditModal';
import { SleepMusicEditModal } from './sleepMusic/SleepMusicEditModal';

const MUSIC_CATEGORIES: Category[] = [
  Category.SLEEP_MUSIC,
  Category.MEDITATION,
  Category.CHAKRA,
];

function musicToContentItem(m: MusicEntry, category: Category): ContentItem {
  const previewUrl =
    category === Category.CHAKRA ? m.visualUrl || m.audioFilename : m.audioFilename;
  const previewType: ContentItem["type"] =
    category === Category.CHAKRA && !!m.visualUrl ? "MP4" : "MP3";

  return {
    id: m._id || m.id || '',
    title: m.name,
    category,
    type: previewType,
    duration: '--',
    status: 'Active',
    date: m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '--',
    plays: 0,
    url: previewUrl,
  };
}

function mantraToContentItem(v: MantraEntry): ContentItem {
  const durationStr = v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : '--';
  return {
    id: v._id,
    title: v.title,
    category: Category.MANTRAS,
    type: 'MP3',
    duration: durationStr,
    status: v.isActive !== false ? 'Active' : 'Draft',
    date: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '--',
    plays: v.views ?? 0,
    url: v.audioUrl,
  };
}

interface ContentManagerProps {
  category: Category;
  refreshKey?: number;
  onOpenUpload: () => void;
}

const PreviewPlayer: React.FC<{ item: ContentItem; onClose: () => void }> = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-deep-teal/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-sand/10">
          <div>
            <h3 className="font-serif text-xl font-bold text-deep-teal">{item.title}</h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{item.category.replace('-', ' ')} • {item.type}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-all">✕</button>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center bg-cream/30 min-h-[300px]">
          {item.type === 'MP4' ? (
            <video 
              controls 
              autoPlay 
              className="w-full rounded-2xl shadow-lg border border-teal-light/20"
              src={item.url}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full py-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-teal-primary/10 rounded-full flex items-center justify-center text-4xl mb-6 animate-pulse">
                🎵
              </div>
              <audio 
                controls 
                autoPlay 
                className="w-full custom-audio-player"
                src={item.url}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-tighter text-slate-400 font-bold">Duration</p>
              <p className="text-sm font-bold text-deep-teal">{item.duration}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-tighter text-slate-400 font-bold">Total Plays</p>
              <p className="text-sm font-bold text-deep-teal">{item.plays.toLocaleString()}</p>
            </div>
          </div>
          <button className="px-6 py-2 bg-teal-primary text-white rounded-xl font-bold text-sm shadow-md">
            Edit Details
          </button>
        </div>
      </div>
    </div>
  );
};

type SortKey = keyof ContentItem;

export const ContentManager: React.FC<ContentManagerProps> = ({ category, refreshKey = 0, onOpenUpload }) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [mantrasById, setMantrasById] = useState<Record<string, MantraEntry>>({});
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [editingMantra, setEditingMantra] = useState<MantraEntry | null>(null);
  const [editingSleepMusicId, setEditingSleepMusicId] = useState<string | null>(null);
  const [editingChakraId, setEditingChakraId] = useState<string | null>(null);
  const [editingMeditationId, setEditingMeditationId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (category === Category.MANTRAS) {
        const data = await mantrasService.getAll();
        setContent(data.map(mantraToContentItem));
        setMantrasById(
          data.reduce<Record<string, MantraEntry>>((acc, mantra) => {
            acc[mantra._id] = mantra;
            return acc;
          }, {})
        );
      } else if (MUSIC_CATEGORIES.includes(category)) {
        const data = await musicContentService.getMusicsByCategory(category);
        setContent(data.map((m) => musicToContentItem(m, category)));
        setMantrasById({});
      } else {
        setContent([]);
        setMantrasById({});
      }
    } catch (error) {
      console.error("Content fetch error:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [category, refreshKey]);

  const handleDelete = async (item: ContentItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setDeletingId(item.id);
    try {
      if (category === Category.MANTRAS) {
        await mantrasService.delete(item.id);
        toast.success("Mantra deleted");
      } else if (MUSIC_CATEGORIES.includes(category)) {
        await musicContentService.delete(item.id);
        toast.success("Content deleted");
      }
      fetchContent();
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const sortedContent = useMemo(() => {
    let sortableItems = [...content];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.key === 'date') {
          const dateA = new Date(a.date as string).getTime();
          const dateB = new Date(b.date as string).getTime();
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        if (aValue === undefined || bValue === undefined) return 0;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [content, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '🔼' : '🔽';
  };

  const handlePreview = (item: ContentItem) => {
    if (!item.url) {
      alert("No preview URL available for this item.");
      return;
    }
    setPreviewItem(item);
  };

  const handleEdit = (item: ContentItem) => {
    if (category === Category.MANTRAS) {
      const mantra = mantrasById[item.id];
      if (!mantra) {
        toast.error("Unable to find mantra details.");
        return;
      }
      setEditingMantra(mantra);
      return;
    }

    if (category === Category.SLEEP_MUSIC) {
      setEditingSleepMusicId(item.id);
      return;
    }

    if (category === Category.CHAKRA) {
      setEditingChakraId(item.id);
      return;
    }

    if (category === Category.MEDITATION) {
      setEditingMeditationId(item.id);
      return;
    }

    toast.info("Edit is currently available for sleep music, mantras, chakra, and guided meditation.");
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-deep-teal capitalize">
            {category.replace('-', ' ')}
          </h1>
          <p className="text-slate-500 font-medium">Manage and organize your {category.replace('-', ' ')} content library.</p>
        </div>
        <button onClick={onOpenUpload} className="px-6 py-2.5 bg-teal-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm">
          + Upload New
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="h-full flex items-center justify-center p-20">
            <div className="w-10 h-10 border-4 border-teal-primary/30 border-t-teal-primary rounded-full animate-spin"></div>
          </div>
        ) : content.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-20 text-center">
            <div className="text-6xl mb-4 opacity-20">📁</div>
            <h3 className="text-xl font-serif font-bold text-slate-400 mb-2">No content found in this category</h3>
            <p className="text-slate-400 max-w-sm mb-6">Start growing your library by uploading your first track or course material.</p>
            <button onClick={onOpenUpload} className="px-8 py-3 bg-teal-primary/10 text-teal-primary font-bold rounded-xl hover:bg-teal-primary hover:text-white transition-all">
              Upload First Track
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-sand/30 border-b border-slate-100">
              <tr>
                <th 
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary cursor-pointer hover:bg-sand/40 transition-colors group"
                  onClick={() => requestSort('title')}
                >
                  <div className="flex items-center gap-1">
                    Title <span className="text-[8px] group-hover:scale-125 transition-transform">{getSortIndicator('title')}</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary cursor-pointer hover:bg-sand/40 transition-colors group"
                  onClick={() => requestSort('plays')}
                >
                  <div className="flex items-center gap-1">
                    Plays <span className="text-[8px] group-hover:scale-125 transition-transform">{getSortIndicator('plays')}</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Length</th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary cursor-pointer hover:bg-sand/40 transition-colors group"
                  onClick={() => requestSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status <span className="text-[8px] group-hover:scale-125 transition-transform">{getSortIndicator('status')}</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary cursor-pointer hover:bg-sand/40 transition-colors group"
                  onClick={() => requestSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Added Date <span className="text-[8px] group-hover:scale-125 transition-transform">{getSortIndicator('date')}</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedContent.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                      <span>{item.type}</span>
                      {item.url && <span className="w-1 h-1 bg-slate-200 rounded-full" />}
                      {item.url && <span className="text-teal-primary/60 text-[10px]">Preview Available</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.plays.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.duration}</td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                      item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                      item.status === 'Draft' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.date}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handlePreview(item)}
                        className="p-2 hover:bg-teal-primary/10 rounded-lg text-slate-400 hover:text-teal-primary transition-colors flex items-center justify-center"
                        title="Preview Content"
                      >
                        <span className="text-lg leading-none">▶️</span>
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        disabled={category !== Category.MANTRAS && category !== Category.SLEEP_MUSIC && category !== Category.CHAKRA && category !== Category.MEDITATION}
                        className="p-2 hover:bg-teal-primary/10 rounded-lg text-slate-400 hover:text-teal-primary transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                          category === Category.MANTRAS
                            ? "Edit mantra"
                            : category === Category.SLEEP_MUSIC
                              ? "Edit sleep music"
                            : category === Category.CHAKRA
                              ? "Edit chakra"
                              : category === Category.MEDITATION
                                ? "Edit guided meditation"
                                : "Editing is available for sleep music, mantras, chakra, and guided meditation"
                        }
                      >
                        <span className="text-lg leading-none">✏️</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Delete"
                      >
                        <span className="text-lg leading-none">🗑️</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewItem && (
        <PreviewPlayer 
          item={previewItem} 
          onClose={() => setPreviewItem(null)} 
        />
      )}

      {editingMantra && (
        <MantraEditModal
          mantra={editingMantra}
          onClose={() => setEditingMantra(null)}
          onSuccess={() => {
            setEditingMantra(null);
            fetchContent();
          }}
        />
      )}

      {editingChakraId && (
        <ChakraEditModal
          chakraId={editingChakraId}
          onClose={() => setEditingChakraId(null)}
          onSuccess={() => {
            setEditingChakraId(null);
            fetchContent();
          }}
        />
      )}

      {editingSleepMusicId && (
        <SleepMusicEditModal
          musicId={editingSleepMusicId}
          onClose={() => setEditingSleepMusicId(null)}
          onSuccess={() => {
            setEditingSleepMusicId(null);
            fetchContent();
          }}
        />
      )}

      {editingMeditationId && (
        <GuidedMeditationEditModal
          meditationId={editingMeditationId}
          onClose={() => setEditingMeditationId(null)}
          onSuccess={() => {
            setEditingMeditationId(null);
            fetchContent();
          }}
        />
      )}
    </div>
  );
};
