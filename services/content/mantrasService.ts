/**
 * Mantras Service – /mantras API (SchoolOfBreathBackendAPIs)
 * GET /mantras → response.mantras
 * POST /mantras, PUT/PATCH /mantras/:id, DELETE /mantras/:id
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

type DeityOption = (typeof DEITY_OPTIONS)[number];

const BENEFITS_BY_DEITY: Record<DeityOption, readonly string[]> = {
  SHIVA: ["CALM", "HEALING", "FORGIVENESS", "SLEEP"],
  HANUMAN: ["ENERGY", "PROTECTION", "CONFIDENCE", "DEVOTION"],
  KRISHNA: ["DEVOTION", "CALM", "HEALING", "FORGIVENESS"],
  DEVI: ["PROTECTION", "HEALING", "CONFIDENCE", "CALM"],
  GANESHA: ["PROTECTION", "CONFIDENCE", "ENERGY", "CALM"],
  GURU: ["CALM", "DEVOTION", "FORGIVENESS", "HEALING"],
  UNIVERSAL: BENEFIT_OPTIONS,
};

export const getBenefitOptionsForDeity = (deity: string): readonly string[] =>
  BENEFITS_BY_DEITY[deity as DeityOption] ?? BENEFIT_OPTIONS;

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

export interface UpdateMantraPayload {
  title?: string;
  description?: string;
  duration?: number; // seconds
  audioUrl?: string;
  thumbnailUrl?: string;
  deity?: string;
  benefit?: string;
  difficulty?: string;
  category?: string;
  isPremium?: boolean;
  isActive?: boolean;
}

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

const unwrapMantraEntry = (
  data: MantraEntry | { data?: MantraEntry }
): MantraEntry => {
  if ("data" in data && data.data) {
    return data.data;
  }
  return data as MantraEntry;
};

export const mantrasService = {
  async getAll(): Promise<MantraEntry[]> {
    const data = await fetchJson<{ mantras?: MantraEntry[] }>(
      `${getContentApiUrl()}/mantras?limit=500&includeInactive=true`
    );
    return Array.isArray(data?.mantras) ? data.mantras : [];
  },

  async create(payload: CreateMantraPayload): Promise<MantraEntry> {
    const res = await fetchJson<MantraEntry | { data: MantraEntry }>(
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
    return unwrapMantraEntry(res);
  },

  async update(id: string, payload: UpdateMantraPayload): Promise<MantraEntry> {
    const body = JSON.stringify(payload);
    const requestInit = (method: "PUT" | "PATCH"): RequestInit => ({
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });

    try {
      const res = await fetchJson<MantraEntry | { data: MantraEntry }>(
        `${getContentApiUrl()}/mantras/${id}`,
        requestInit("PUT")
      );
      return unwrapMantraEntry(res);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }
      const res = await fetchJson<MantraEntry | { data: MantraEntry }>(
        `${getContentApiUrl()}/mantras/${id}`,
        requestInit("PATCH")
      );
      return unwrapMantraEntry(res);
    }
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${getContentApiUrl()}/mantras/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete");
  },
};
