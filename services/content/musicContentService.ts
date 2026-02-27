/**
 * Music Content Service – Sleep Music, Meditation, Chakra
 * Aligned with sleepmusicadmin and app endpoints (api-music-iota):
 * - Sleep Music: GET /app/musics/preview (typeContent 'app', excludes shakra/guided-meditation)
 * - Guided Meditation: GET /app/musics/guided-meditation?page=&limit=
 * - Chakra: GET /app/musics/shakra
 * App uses /app/musics/category and /app/musics/preview – both query typeContent: 'app' only.
 */
import { getContentApiUrl } from "../../utils/contentApi.config";
import { Category } from "../../types";

export interface CategoryType {
  _id: string;
  name: string;
  type: string;
  slug: string;
  __v?: number;
}

export interface MusicEntry {
  _id: string;
  id?: string;
  name: string;
  position?: number;
  favorites?: string[];
  audioFilename: string;
  imageFilename: string;
  categories: string[];
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  description?: string;
  isPremium?: boolean;
  typeContent?: "music" | "app";
}

export interface CreateMusicPayload {
  name: string;
  description: string;
  categoryId?: string;
  categories?: string | string[]; // category _id(s) - backend expects categories array
  isPremium: boolean | string;
  typeContent?: "music" | "app";
  audioFilename: string;
  imageFilename: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  [Category.SLEEP_MUSIC]: ["sleep", "sleep-music", "Sleep Music"],
  [Category.MEDITATION]: ["meditation", "guided", "Meditation"],
  [Category.CHAKRA]: ["chakra", "Chakra", "Chakra Music"],
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Request failed");
  }
  return res.json();
};

export const musicContentService = {
  async getCategories(): Promise<CategoryType[]> {
    const data = await fetchJson<CategoryType[] | { data: CategoryType[] }>(
      `${getContentApiUrl()}/categories/admin`
    );
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  async getMusicCategories(): Promise<CategoryType[]> {
    const all = await this.getCategories();
    return all.filter((c) => c.type === "music");
  },

  /** Sleep Music for app – same endpoint the app uses (typeContent 'app', excludes shakra/guided-meditation) */
  async getSleepMusic(): Promise<MusicEntry[]> {
    const data = await fetchJson<{ musicList?: MusicEntry[] }>(
      `${getContentApiUrl()}/app/musics/preview?category=`
    );
    return data?.musicList ?? [];
  },

  async getMusics(): Promise<MusicEntry[]> {
    const data = await fetchJson<MusicEntry[] | { data: MusicEntry[] }>(
      `${getContentApiUrl()}/musics`
    );
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    return list;
  },

  /** Guided Meditation – uses dedicated endpoint per sleepmusicadmin */
  async getGuidedMeditation(page = 1, limit = 100): Promise<MusicEntry[]> {
    const data = await fetchJson<{ musicList?: MusicEntry[] }>(
      `${getContentApiUrl()}/app/musics/guided-meditation?page=${page}&limit=${limit}`
    );
    return data?.musicList ?? [];
  },

  /** Chakra – uses dedicated endpoint per sleepmusicadmin */
  async getChakraMusic(): Promise<MusicEntry[]> {
    const data = await fetchJson<{ musicList?: MusicEntry[] }>(
      `${getContentApiUrl()}/app/musics/shakra`
    );
    return data?.musicList ?? [];
  },

  async getMusicsByCategory(category: Category): Promise<MusicEntry[]> {
    if (category === Category.MEDITATION) {
      return this.getGuidedMeditation();
    }
    if (category === Category.CHAKRA) {
      return this.getChakraMusic();
    }
    if (category === Category.SLEEP_MUSIC) {
      return this.getSleepMusic();
    }
    const [musics, categories] = await Promise.all([
      this.getMusics(),
      this.getMusicCategories(),
    ]);
    const keywords = CATEGORY_KEYWORDS[category] ?? [category];
    const match = categories.find((c) =>
      keywords.some(
        (kw) =>
          c.slug?.toLowerCase().includes(kw.toLowerCase()) ||
          c.name?.toLowerCase().includes(kw.toLowerCase())
      )
    );
    if (!match) return musics;
    return musics.filter((m) => {
      const cats = m.categories || [];
      return cats.some((c: unknown) =>
        c === match._id ||
        (typeof c === "object" && c && "_id" in c && (c as { _id: string })._id === match._id)
      );
    });
  },

  async create(payload: CreateMusicPayload): Promise<MusicEntry> {
    const isApp = payload.typeContent === "app";
    const { categoryId, categories, ...rest } = payload;
    const body: Record<string, unknown> = {
      ...rest,
      isPremium:
        typeof payload.isPremium === "string"
          ? payload.isPremium
          : payload.isPremium
            ? "true"
            : "false",
      typeContent: isApp ? "app" : "music",
    };
    // Send category as array of IDs; backend accepts categoryId or categories
    const catId = categories || categoryId;
    if (catId) {
      body.categories = Array.isArray(catId) ? catId : [catId];
    }
    return fetchJson(`${getContentApiUrl()}/musics/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${getContentApiUrl()}/uploadFiles/delete/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete");
  },
};
