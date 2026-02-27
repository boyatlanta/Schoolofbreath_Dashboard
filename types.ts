export enum Category {
  SLEEP_MUSIC = 'sleep-music',
  MEDITATION = 'meditation',
  MANTRAS = 'mantras',
  CHAKRA = 'chakra',
  COURSES = 'courses',
  NOTIFICATIONS = 'notifications'
}

/** Mantra benefits - "How do you want to feel?" (select one or more) */
export const MANTRA_BENEFITS = [
  { id: 'ENERGY_FOCUS', label: 'Energy & Focus' },
  { id: 'ANXIETY_STRESS', label: 'Anxiety & Stress' },
  { id: 'DEEP_SLEEP_REST', label: 'Deep Sleep & Rest' },
  { id: 'COURAGE_PROTECTION', label: 'Courage & Protection' },
  { id: 'HEALING_RECOVERY', label: 'Healing & Recovery' },
  { id: 'DEVOTION_CONNECTION', label: 'Devotion & Connection' },
  { id: 'CONFIDENCE', label: 'Confidence' },
  { id: 'LETTING_GO', label: 'Letting Go' },
] as const;

/** Sleep Music categories */
export const SLEEP_MUSIC_CATEGORIES = [
  'Ambient', 'Nature Sounds', 'Rain', 'Ocean', 'White Noise',
  'Piano', 'Binaural', 'Lo-Fi', 'Soundscapes',
] as const;

/** Guided Meditation categories */
export const MEDITATION_CATEGORIES = [
  'Sleep', 'Stress Relief', 'Mindfulness', 'Body Scan',
  'Breathing', 'Anxiety', 'Focus', 'Morning', 'Evening',
] as const;

/** Chakra Music categories (7 chakras + general) */
export const CHAKRA_CATEGORIES = [
  'Root', 'Sacral', 'Solar Plexus', 'Heart', 'Throat',
  'Third Eye', 'Crown', 'Full Chakra',
] as const;

/** Mantra categories for Mantra Explorer - Deity Path (lineage) & Benefit Path (emotional states) */
export const MANTRA_CATEGORIES = [
  'SHIVA',
  'HANUMAN',
  'GAYATRI',
  'DEVI',
  'GANESHA',
  'LAKSHMI',
  'KRISHNA',
  'BUDDHA',
  'OM',
  'UNIVERSAL',
  'SARASWATI',
  'DURGA',
  'RAMA',
  'VISHNU',
] as const;

export interface ContentItem {
  id: string;
  title: string;
  category: Category;
  type: 'MP3' | 'MP4';
  duration: string;
  status: 'Active' | 'Draft' | 'Processing';
  date: string;
  plays: number;
  url?: string;
}

export interface StatItem {
  label: string;
  value: string | number;
  change: string;
  icon: string;
  colorClass: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  type: string;
  recipients: number;
  sentDate: string;
  openRate: string;
  status: 'Delivered' | 'Pending';
}

export interface ScheduledNotificationConfig {
  id: string;
  time: string;
  title: string;
  body: string;
  runningInBackground: boolean;
}

export interface NotificationScheduleConfig {
  breathingTime: string;
  breathingTitle: string;
  breathingBody: string;
  breathingEnabled: boolean;
  breathingCadence: 'daily' | 'occasional';
  breathingIntervalDays: number;
  timezone: string;
  courseRemindersEnabled: boolean;
}

export type NewReleaseContentType =
  | 'course'
  | 'track'
  | 'mantra'
  | 'collection'
  | 'other';

export type NewReleaseTargetSegment =
  | 'all-users'
  | 'active-subscribers'
  | 'new-users-7d'
  | 'new-users-30d';

export interface NewReleaseLinkOption {
  key: string;
  label: string;
  description: string;
  contentType: NewReleaseContentType;
  template: string;
  requiredParams: string[];
  resolvesTo: string;
}

export interface NewReleasesBlastConfig {
  title: string;
  body: string;
  deepLink: string;
  contentType: NewReleaseContentType;
  targetSegment: NewReleaseTargetSegment;
  scheduleAt?: string | null;
  data?: Record<string, string>;
}
