/**
 * Mantras Service – /mantras API (SchoolOfBreathBackendAPIs)
 * GET /mantras → response.mantras
 * POST /mantras, DELETE /mantras/:id
 */
import { getContentApiUrl } from "../../utils/contentApi.config";

export const DEITY_OPTIONS = [
  "SHIVA",
  "HANUMAN",
  "KRISHNA",
  "DEVI",
  "GANESHA",
  "GURU",
  "UNIVERSAL",
] as const;

export const BENEFIT_OPTIONS = [
  "ENERGY",
  "CALM",
  "SLEEP",
  "PROTECTION",
  "HEALING",
  "DEVOTION",
  "CONFIDENCE",
  "FORGIVENESS",
] as const;

export interface MantraEntry {
  _id: string;
  title: string;
  description: string;
  duration: number; // seconds
  audioUrl: string;
  thumbnailUrl?: string;
  deity: string;
  benefit: string;
  difficulty?: string;
  category?: string;
  isPremium?: boolean;
  isActive?: boolean;
  views?: number;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMantraPayload {
  title: string;
  description: string;
  duration: number; // seconds
  audioUrl: string;
  thumbnailUrl?: string;
  deity: string;
  benefit: string;
  difficulty?: string;
  isPremium?: boolean;
  isActive?: boolean;
}

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Request failed");
  }
  return res.json();
};

export const mantrasService = {
  async getAll(): Promise<MantraEntry[]> {
    const data = await fetchJson<{ mantras?: MantraEntry[] }>(
      `${getContentApiUrl()}/mantras?limit=500&includeInactive=true`
    );
    return Array.isArray(data?.mantras) ? data.mantras : [];
  },

  async create(payload: CreateMantraPayload): Promise<MantraEntry> {
    const res = await fetchJson<{ data: MantraEntry }>(
      `${getContentApiUrl()}/mantras`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          isActive: payload.isActive ?? true,
        }),
      }
    );
    return (res as { data: MantraEntry }).data;
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${getContentApiUrl()}/mantras/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete");
  },
};
