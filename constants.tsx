import React from 'react';
import {
  Category,
  StatItem,
  ContentItem,
  NotificationRecord,
  NewReleaseContentType,
  NewReleaseTargetSegment,
  NewReleaseLinkOption,
  NewReleasesBlastConfig,
} from './types';

export const STATS_DATA: StatItem[] = [
  { label: 'Total Tracks', value: 248, change: '↑ 12 new this week', icon: '🎵', colorClass: 'bg-mint' },
  { label: 'Active Courses', value: 12, change: '↑ 3 updated today', icon: '📚', colorClass: 'bg-lavender' },
];

export const INITIAL_CONTENT: ContentItem[] = [
  {
    id: '1',
    title: 'Deep Ocean Waves',
    category: Category.SLEEP_MUSIC,
    type: 'MP3',
    duration: '45:32',
    status: 'Active',
    date: 'Feb 15, 2026',
    plays: 1250,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: '2',
    title: 'Morning Chakra Alignment',
    category: Category.CHAKRA,
    type: 'MP3',
    duration: '30:15',
    status: 'Active',
    date: 'Feb 14, 2026',
    plays: 840,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: '3',
    title: 'Breathwork Fundamentals',
    category: Category.COURSES,
    type: 'MP4',
    duration: '12:45',
    status: 'Processing',
    date: 'Feb 14, 2026',
    plays: 0,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  },
  {
    id: '4',
    title: 'Sacred Om Meditation',
    category: Category.MANTRAS,
    type: 'MP3',
    duration: '20:30',
    status: 'Draft',
    date: 'Feb 13, 2026',
    plays: 0,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: '5',
    title: 'Body Scan Meditation',
    category: Category.MEDITATION,
    type: 'MP3',
    duration: '25:00',
    status: 'Active',
    date: 'Feb 12, 2026',
    plays: 2100,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  },
];

export const NOTIFICATION_HISTORY: NotificationRecord[] = [
  { id: 'n1', title: 'New Releases', type: 'Push', recipients: 2847, sentDate: 'Feb 15, 2026', openRate: '92%', status: 'Delivered' },
  { id: 'n2', title: 'Breathing Sessions', type: 'Push', recipients: 3194, sentDate: 'Feb 15, 2026', openRate: '78%', status: 'Delivered' },
  { id: 'n3', title: 'Course Reminders', type: 'Push', recipients: 1523, sentDate: 'Feb 14, 2026', openRate: '85%', status: 'Delivered' },
];

export const BREATHING_SESSIONS_DEFAULT = {
  id: 'breathing-sessions',
  time: '08:00',
  title: 'Breathing Session Reminder',
  body: 'Take a few mindful breaths with {{patternName}}.',
  runningInBackground: true,
};

export const NEW_RELEASE_CONTENT_TYPES: NewReleaseContentType[] = [
  'course',
  'track',
  'mantra',
  'collection',
  'other',
];

export const NEW_RELEASE_TARGET_SEGMENTS: NewReleaseTargetSegment[] = [
  'all-users',
  'active-subscribers',
  'new-users-7d',
  'new-users-30d',
];

export const NEW_RELEASE_LINK_OPTIONS_DEFAULT: NewReleaseLinkOption[] = [
  {
    key: 'discover-guided',
    label: 'Discover guided sessions',
    description: 'Open the guided meditations discovery tab.',
    contentType: 'other',
    template: '/meditate?tab=guided',
    requiredParams: [],
    resolvesTo: '/meditate?tab=guided',
  },
  {
    key: 'course-detail',
    label: 'Course detail',
    description: 'Open a specific course page.',
    contentType: 'course',
    template: 'sob://course/{courseId}',
    requiredParams: ['courseId'],
    resolvesTo: '/course/{courseId}',
  },
  {
    key: 'track-detail',
    label: 'Sleep music track',
    description: 'Open Sleep Music and preselect a track.',
    contentType: 'track',
    template: 'sob://track/{trackId}',
    requiredParams: ['trackId'],
    resolvesTo: '/sleep-music?trackId={trackId}',
  },
  {
    key: 'mantra-detail',
    label: 'Mantra item',
    description: 'Open Mantra Explorer and preselect a mantra.',
    contentType: 'mantra',
    template: 'sob://mantra/{mantraId}',
    requiredParams: ['mantraId'],
    resolvesTo: '/mantra-explorer?mantraId={mantraId}',
  },
  {
    key: 'collection-detail',
    label: 'Meditation collection',
    description: 'Open a specific guided collection.',
    contentType: 'collection',
    template: 'sob://collection/{collectionId}',
    requiredParams: ['collectionId'],
    resolvesTo: '/meditate?tab=guided&collectionId={collectionId}',
  },
];

export const NEW_RELEASES_BLAST_DEFAULT: NewReleasesBlastConfig = {
  title: 'New Releases',
  body: 'Explore the newest guided sessions.',
  deepLink: '/meditate?tab=guided',
  contentType: 'other',
  targetSegment: 'all-users',
  scheduleAt: null,
};
