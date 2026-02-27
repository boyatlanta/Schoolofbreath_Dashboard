/**
 * Dashboard service – aggregates real data from api-music-iota for overview stats.
 * - Stats: Total Tracks, Active Courses (from content APIs)
 * - Category cards: Sleep Music, Meditation, Mantras, Chakra, Courses (count + plays)
 * - Recent Activity: combined from music + mantras, sorted by date
 */
import { Category, ContentItem, StatItem } from '../types';
import { getContentApiUrl } from '../utils/contentApi.config';
import { musicContentService, mantrasService } from './content';
import type { MusicEntry } from './content';
import type { MantraEntry } from './content';
import { fetchScratchCourses } from './coursesService';
import { apiService } from './apiService';
import { formatDurationLabel } from '../utils/audioDuration';

const NOTIFICATIONS_LABEL = 'notifications';

const parseNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
};

const formatDateValue = (value: unknown): string => {
  if (!value) return "--";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString();
};

export interface CategoryStats {
  count: number;
  plays: number;
  /** For notifications: display string e.g. "87%" open rate */
  playsDisplay?: string;
}

export interface DashboardData {
  stats: StatItem[];
  categoryStats: Record<string, CategoryStats>;
  recentActivity: ContentItem[];
}

function musicToContentItem(m: MusicEntry, category: Category): ContentItem {
  const plays = (m as MusicEntry & { plays?: number; views?: number }).plays ?? (m as MusicEntry & { views?: number }).views ?? 0;
  return {
    id: m._id || (m as MusicEntry & { id?: string }).id || '',
    title: m.name,
    category,
    type: 'MP3',
    duration: formatDurationLabel(m.duration),
    status: 'Active',
    date: m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '--',
    plays,
    url: m.audioFilename,
  };
}

function mantraToContentItem(v: MantraEntry): ContentItem {
  const raw = v as unknown as Record<string, unknown>;
  const durationSeconds = parseNumberValue(raw.duration);
  const plays =
    parseNumberValue(raw.views) ??
    parseNumberValue(raw.plays) ??
    parseNumberValue(raw.playCount) ??
    0;
  const isActive = parseBooleanValue(raw.isActive);

  return {
    id: String(raw._id || raw.id || ''),
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : 'Untitled Mantra',
    category: Category.MANTRAS,
    type: 'MP3',
    duration: durationSeconds && durationSeconds > 0 ? formatDurationLabel(durationSeconds) : '--',
    status: isActive === false ? 'Draft' : 'Active',
    date: formatDateValue(raw.createdAt || raw.updatedAt),
    plays: Math.max(0, Math.trunc(plays)),
    url: typeof raw.audioUrl === "string" ? raw.audioUrl : undefined,
  };
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [
    sleepMusic,
    guidedMeditation,
    chakraMusic,
    mantras,
    scratchCourses,
    notifications,
  ] = await Promise.all([
    musicContentService.getMusicsByCategory(Category.SLEEP_MUSIC),
    musicContentService.getMusicsByCategory(Category.MEDITATION),
    musicContentService.getMusicsByCategory(Category.CHAKRA),
    mantrasService.getAll(),
    fetchScratchCourses().catch(() => null),
    apiService.getNotifications().catch(() => []),
  ]);

  const sleepItems = sleepMusic.map((m) => musicToContentItem(m, Category.SLEEP_MUSIC));
  const meditationItems = guidedMeditation.map((m) => musicToContentItem(m, Category.MEDITATION));
  const chakraItems = chakraMusic.map((m) => musicToContentItem(m, Category.CHAKRA));
  const mantraItems = mantras.map(mantraToContentItem);

  const totalTracks = sleepMusic.length + guidedMeditation.length + chakraMusic.length + mantras.length;
  const courseList = Array.isArray(scratchCourses) ? scratchCourses : (scratchCourses as { courses?: unknown[] } | null)?.courses ?? [];
  const courseCount = Array.isArray(courseList) ? courseList.length : 0;

  const categoryStats: Record<string, CategoryStats> = {
    [Category.SLEEP_MUSIC]: {
      count: sleepMusic.length,
      plays: sleepItems.reduce((sum, i) => sum + i.plays, 0),
    },
    [Category.MEDITATION]: {
      count: guidedMeditation.length,
      plays: meditationItems.reduce((sum, i) => sum + i.plays, 0),
    },
    [Category.MANTRAS]: {
      count: mantras.length,
      plays: mantraItems.reduce((sum, i) => sum + i.plays, 0),
    },
    [Category.CHAKRA]: {
      count: chakraMusic.length,
      plays: chakraItems.reduce((sum, i) => sum + i.plays, 0),
    },
    courses: { count: courseCount, plays: 0 },
    [NOTIFICATIONS_LABEL]: {
      count: Array.isArray(notifications) ? notifications.length : 0,
      plays: 0,
      playsDisplay: Array.isArray(notifications) && notifications.length > 0
        ? (notifications as { openRate?: string }[]).reduce((sum, n) => {
            const pct = parseInt(String(n.openRate || '0').replace(/%/g, ''), 10);
            return sum + (isNaN(pct) ? 0 : pct);
          }, 0) / notifications.length + '%'
        : '—',
    },
  };

  const allActivity: ContentItem[] = [
    ...sleepItems,
    ...meditationItems,
    ...chakraItems,
    ...mantraItems,
  ];
  allActivity.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
  const recentActivity = allActivity.slice(0, 5);

  const stats: StatItem[] = [
    { label: 'Total Tracks', value: totalTracks, change: 'Live from content API', icon: '🎵', colorClass: 'bg-mint' },
    { label: 'Active Courses', value: courseCount, change: 'Live from courses API', icon: '📚', colorClass: 'bg-lavender' },
  ];

  return { stats, categoryStats, recentActivity };
}
