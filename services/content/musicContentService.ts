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

export interface MusicCategoryRef {
  _id: string;
  name?: string;
  slug?: string;
  type?: string;
}

export interface MusicEntry {
  _id: string;
  id?: string;
  name: string;
  position?: number;
  duration?: number;
  favorites?: string[];
  audioFilename: string;
  imageFilename: string;
  visualUrl?: string;
  categories: Array<string | MusicCategoryRef>;
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
  categories?: string | string[] | MusicCategoryRef | MusicCategoryRef[]; // category _id(s) - backend expects categories array
  isPremium: boolean | string;
  typeContent?: "music" | "app";
  audioFilename: string;
  imageFilename?: string;
  duration?: number;
  visualUrl?: string;
  slug?: string;
  position?: number;
}

export interface UpdateMusicPayload {
  name?: string;
  description?: string;
  categoryId?: string;
  categories?: string | string[] | MusicCategoryRef | MusicCategoryRef[];
  isPremium?: boolean | string;
  typeContent?: "music" | "app";
  audioFilename?: string;
  imageFilename?: string;
  duration?: number;
  visualUrl?: string;
  slug?: string;
  position?: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  [Category.SLEEP_MUSIC]: ["sleep", "sleep-music", "Sleep Music"],
  [Category.MEDITATION]: ["meditation", "guided", "Meditation"],
  [Category.CHAKRA]: ["chakra", "shakra", "Chakra", "Chakra Music"],
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(
      (err as { message?: string }).message ?? "Request failed"
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

const normalizeCategoryIds = (
  categories?: string | string[] | MusicCategoryRef | MusicCategoryRef[]
): string[] => {
  if (!categories) return [];
  const raw = Array.isArray(categories) ? categories : [categories];
  return raw
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "_id" in entry) {
        return entry._id;
      }
      return "";
    })
    .filter(Boolean);
};

const unwrapMusicEntry = (
  data: MusicEntry | { data?: MusicEntry } | { music?: MusicEntry }
): MusicEntry => {
  if ("data" in data && data.data) return data.data;
  if ("music" in data && data.music) return data.music;
  return data as MusicEntry;
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
      return cats.some((c) => {
        if (typeof c === "string") return c === match._id;
        return c?._id === match._id;
      });
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
    const categoryIds = normalizeCategoryIds(categories || categoryId);
    if (categoryIds.length > 0) {
      body.categories = categoryIds;
    }
    const res = await fetchJson<MusicEntry | { data: MusicEntry }>(
      `${getContentApiUrl()}/musics/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    return unwrapMusicEntry(res);
  },

  async getById(id: string): Promise<MusicEntry> {
    try {
      const res = await fetchJson<MusicEntry | { data: MusicEntry }>(
        `${getContentApiUrl()}/musics/detail/${id}`
      );
      return unwrapMusicEntry(res);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }
      const res = await fetchJson<MusicEntry | { data: MusicEntry }>(
        `${getContentApiUrl()}/musics/${id}`
      );
      return unwrapMusicEntry(res);
    }
  },

  async update(id: string, payload: UpdateMusicPayload): Promise<MusicEntry> {
    const { categoryId, categories, ...rest } = payload;
    const body: Record<string, unknown> = {
      ...rest,
    };

    if (payload.typeContent) {
      body.typeContent = payload.typeContent === "app" ? "app" : "music";
    }

    if (payload.isPremium !== undefined) {
      body.isPremium =
        typeof payload.isPremium === "string"
          ? payload.isPremium
          : payload.isPremium
            ? "true"
            : "false";
    }

    const categoryIds = normalizeCategoryIds(categories || categoryId);
    if (categoryIds.length > 0) {
      body.categories = categoryIds;
      body.categoryId = categoryIds[0];
    }

    try {
      const res = await fetchJson<MusicEntry | { data: MusicEntry }>(
        `${getContentApiUrl()}/musics/edit/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      return unwrapMusicEntry(res);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }

      const res = await fetchJson<MusicEntry | { data: MusicEntry }>(
        `${getContentApiUrl()}/musics/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      return unwrapMusicEntry(res);
    }
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${getContentApiUrl()}/uploadFiles/delete/${id}`, {
      method: "DELETE",
    });
    if (res.ok) return;
    if (res.status !== 404 && res.status !== 405) {
      throw new Error("Failed to delete");
    }
    const fallback = await fetch(`${getContentApiUrl()}/uploadFiles/delete/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!fallback.ok) throw new Error("Failed to delete");
  },
};
