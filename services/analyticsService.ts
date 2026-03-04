/**
 * Analytics Service – reads play stats from /analytics/* endpoints.
 *
 * All functions fail silently (return empty/zero defaults on error) so that
 * a dead analytics API never breaks the rest of the dashboard.
 */
import { getContentApiUrl } from '../utils/contentApi.config';

export type AnalyticsContentType = 'mantra' | 'guided' | 'sleep' | 'chakra' | 'music';

export interface PlayStats {
  totalPlays: number;
  uniqueListeners: number;
}

export interface PopularItem {
  contentId: string;
  contentTitle: string;
  contentType: string;
  totalPlays: number;
  uniqueListeners: number;
  lastPlayedAt?: string;
  totalListenedHours?: number;
}

/**
 * Fetch play stats for a batch of content IDs in one request.
 * Used to populate the "Plays" column in content tables without N+1 calls.
 *
 * @param ids  Array of content _id strings (max 200)
 * @param type Optional: narrow results to a specific contentType
 * @returns    Map of contentId → { totalPlays, uniqueListeners }
 */
export async function getBulkStats(
  ids: string[],
  type?: AnalyticsContentType,
): Promise<Record<string, PlayStats>> {
  if (ids.length === 0) return {};

  try {
    const url = new URL(`${getContentApiUrl()}/analytics/bulk-stats`);
    url.searchParams.set('ids', ids.join(','));
    if (type) url.searchParams.set('type', type);

    const res = await fetch(url.toString());
    if (!res.ok) return {};
    const data = await res.json();
    return (data.stats ?? {}) as Record<string, PlayStats>;
  } catch {
    // Analytics failures must never break the dashboard
    return {};
  }
}

/**
 * Fetch the top-N most played items for a content type.
 * Optionally scoped to a time window (last N days).
 *
 * @param type   Content type
 * @param limit  Max results (default 20)
 * @param days   Time window in days; omit for all-time
 */
export async function getPopularContent(
  type: AnalyticsContentType,
  limit = 20,
  days?: number,
): Promise<PopularItem[]> {
  try {
    const url = new URL(`${getContentApiUrl()}/analytics/popular-content`);
    url.searchParams.set('type', type);
    url.searchParams.set('limit', String(Math.min(limit, 100)));
    if (days) url.searchParams.set('days', String(days));

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []) as PopularItem[];
  } catch {
    return [];
  }
}

/**
 * Returns the total play count across all tracks of a given type.
 * Used to populate the "Total Plays" metric on dashboard category cards.
 *
 * Pass days=7 to get this week's plays, days=30 for this month, omit for all-time.
 */
export async function getCategoryTotalPlays(
  type: AnalyticsContentType,
  days?: number,
): Promise<number> {
  const items = await getPopularContent(type, 100, days);
  return items.reduce((sum, item) => sum + item.totalPlays, 0);
}
