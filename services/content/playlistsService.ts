/**
 * Playlists Service – /mantras/playlists API (curated playlists)
 * Manages admin-created mantra playlists stored in the backend.
 */
import { getContentApiUrl } from '../../utils/contentApi.config';

export interface PlaylistEntry {
  _id: string;
  name: string;
  description: string;
  coverImage?: string;
  accentColor: string;
  isPublic: boolean;
  isActive: boolean;
  trackIds: string[];
  totalDuration: number; // minutes
  playCount: number;
  tags: string[];
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlaylistPayload {
  name: string;
  description?: string;
  coverImage?: string;
  accentColor?: string;
  trackIds?: string[];
  tags?: string[];
  isPublic?: boolean;
  position?: number;
}

export interface UpdatePlaylistPayload {
  name?: string;
  description?: string;
  coverImage?: string;
  accentColor?: string;
  trackIds?: string[];
  tags?: string[];
  isPublic?: boolean;
  isActive?: boolean;
  position?: number;
}

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(
      (err as { message?: string }).message ?? 'Request failed'
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export const playlistsService = {
  async getAll(includeInactive = true): Promise<PlaylistEntry[]> {
    const url = `${getContentApiUrl()}/mantras/playlists?limit=200${includeInactive ? '&includeInactive=true' : ''}`;
    const data = await fetchJson<{ playlists?: PlaylistEntry[] }>(url);
    return Array.isArray(data?.playlists) ? data.playlists : [];
  },

  async getById(id: string): Promise<{ playlist: PlaylistEntry; tracks: object[] }> {
    return fetchJson(`${getContentApiUrl()}/mantras/playlists/${id}`);
  },

  async create(payload: CreatePlaylistPayload): Promise<PlaylistEntry> {
    const data = await fetchJson<{ playlist: PlaylistEntry }>(
      `${getContentApiUrl()}/mantras/playlists`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: true, isActive: true, ...payload }),
      }
    );
    return data.playlist;
  },

  async update(id: string, payload: UpdatePlaylistPayload): Promise<PlaylistEntry> {
    const data = await fetchJson<{ playlist: PlaylistEntry }>(
      `${getContentApiUrl()}/mantras/playlists/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    return data.playlist;
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${getContentApiUrl()}/mantras/playlists/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete playlist');
  },

  /**
   * AI auto-generate tracks for a playlist.
   * Returns the updated playlist with selectedIds.
   */
  async aiGenerateTracks(
    id: string,
    count = 6
  ): Promise<{ playlist: PlaylistEntry; selectedIds: string[] }> {
    return fetchJson(`${getContentApiUrl()}/mantras/playlists/${id}/ai-tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
  },
};
