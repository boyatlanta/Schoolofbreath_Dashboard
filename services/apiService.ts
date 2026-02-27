import {
  Category,
  ContentItem,
  NewReleaseContentType,
  NewReleaseLinkOption,
  NewReleasesBlastConfig,
  NewReleaseTargetSegment,
  NotificationScheduleConfig,
  NotificationRecord,
  StatItem,
} from '../types';
import {
  BREATHING_SESSIONS_DEFAULT,
  STATS_DATA,
  INITIAL_CONTENT,
  NOTIFICATION_HISTORY,
  NEW_RELEASE_CONTENT_TYPES,
  NEW_RELEASE_LINK_OPTIONS_DEFAULT,
  NEW_RELEASE_TARGET_SEGMENTS,
} from '../constants';
import { getNotificationsApiUrl } from '../utils/envConfig';

const AUTH_TOKEN = 'AIzaSyC-qX143hBhNwU_Pz0tZ9_U5e8YQa4q5gQ'; // Must match NOTIFICATIONS_ADMIN_KEY on backend

const getHeaders = (isMultipart = false) => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const parseApiError = async (response: Response, fallback: string): Promise<Error> => {
  const errData = await response.json().catch(() => ({}));
  const message = errData?.message || errData?.error || fallback;
  return new Error(message);
};

export type NewReleaseLinkOptionsResponse = {
  options: NewReleaseLinkOption[];
  targetSegments: NewReleaseTargetSegment[];
  contentTypes: NewReleaseContentType[];
};

const DEFAULT_SCHEDULE_CONFIG: NotificationScheduleConfig = {
  breathingTime: BREATHING_SESSIONS_DEFAULT.time,
  breathingTitle: BREATHING_SESSIONS_DEFAULT.title,
  breathingBody: BREATHING_SESSIONS_DEFAULT.body,
  breathingEnabled: BREATHING_SESSIONS_DEFAULT.runningInBackground,
  breathingCadence: 'daily',
  breathingIntervalDays: 3,
  timezone: 'UTC',
  courseRemindersEnabled: true,
};

export const apiService = {
  /**
   * Admin dashboard stats. Note: breathing-ejercices-api has /breath/stats (user-specific),
   * NOT /stats. Dashboard uses real data from api-music-iota instead.
   */
  async getStats(): Promise<StatItem[]> {
    try {
      const response = await fetch(`${getNotificationsApiUrl()}/stats`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Backend responded with error');
      return await response.json();
    } catch (error) {
      console.warn('API Error /stats:', error);
      return STATS_DATA;
    }
  },

  async getContent(category?: Category): Promise<ContentItem[]> {
    try {
      const url = category ? `${getNotificationsApiUrl()}/content?category=${category}` : `${getNotificationsApiUrl()}/content`;
      const response = await fetch(url, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Backend responded with error');
      return await response.json();
    } catch (error) {
      console.warn(`API Error /content (Category: ${category || 'all'}):`, error);
      if (category) {
        return INITIAL_CONTENT.filter(item => item.category === category);
      }
      return INITIAL_CONTENT;
    }
  },

  async uploadContent(formData: FormData): Promise<ContentItem> {
    try {
      // NOTE: We do NOT set Content-Type header manually for FormData,
      // the browser will set it with the correct boundary.
      const response = await fetch(`${getNotificationsApiUrl()}/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw await parseApiError(response, 'Production upload failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Production Upload Error:', error);
      throw error;
    }
  },

  async getNotifications(): Promise<NotificationRecord[]> {
    try {
      const response = await fetch(`${getNotificationsApiUrl()}/breath/notifications/admin/history`, {
        headers: {
          ...getHeaders(),
          'x-admin-key': AUTH_TOKEN,
        },
      });
      if (!response.ok) throw new Error('Backend responded with error');
      const data = await response.json();
      if (data?.error) throw new Error(data.error);
      return Array.isArray(data) ? data : NOTIFICATION_HISTORY;
    } catch (error) {
      console.warn('API Error /breath/notifications/admin/history:', error);
      return NOTIFICATION_HISTORY;
    }
  },

  async getNotificationScheduleConfig(): Promise<NotificationScheduleConfig> {
    try {
      const response = await fetch(`${getNotificationsApiUrl()}/breath/notifications/schedule-config`, {
        headers: {
          ...getHeaders(),
          'x-admin-key': AUTH_TOKEN,
        },
      });
      if (!response.ok) throw new Error('Backend responded with error');
      const data = await response.json();
      if (data?.error) throw new Error(data.error);
      return { ...DEFAULT_SCHEDULE_CONFIG, ...data };
    } catch (error) {
      console.warn('API Error /breath/notifications/schedule-config:', error);
      return DEFAULT_SCHEDULE_CONFIG;
    }
  },

  async updateNotificationScheduleConfig(
    payload: Partial<NotificationScheduleConfig>
  ): Promise<NotificationScheduleConfig> {
    const response = await fetch(`${getNotificationsApiUrl()}/breath/notifications/schedule-config`, {
      method: 'PUT',
      headers: {
        ...getHeaders(),
        'x-admin-key': AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Failed to update notification schedule');
    }

    const data = await response.json();
    if (data?.error) {
      throw new Error(data.error);
    }
    return { ...DEFAULT_SCHEDULE_CONFIG, ...data };
  },

  async runBreathingSessionsCron(options?: { force?: boolean; manual?: boolean }): Promise<{ ok: boolean }> {
    const query = new URLSearchParams();
    if (options?.force) query.set('force', 'true');
    if (options?.manual) query.set('manual', 'true');
    const qs = query.toString();
    const url = `${getNotificationsApiUrl()}/breath/notifications/cron/breathing-sessions${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'x-admin-key': AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Failed to run breathing sessions cron');
    }

    const data = await response.json();
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  },

  async runCourseRemindersCron(options?: { force?: boolean }): Promise<{ ok: boolean }> {
    const query = new URLSearchParams();
    if (options?.force) query.set('force', 'true');
    const qs = query.toString();
    const url = `${getNotificationsApiUrl()}/breath/notifications/cron/course-reminders${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'x-admin-key': AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Failed to run course reminders cron');
    }

    const data = await response.json();
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  },

  async getNewReleaseLinkOptions(): Promise<NewReleaseLinkOptionsResponse> {
    try {
      const response = await fetch(`${getNotificationsApiUrl()}/breath/notifications/new-releases/link-options`, {
        headers: {
          ...getHeaders(),
          'x-admin-key': AUTH_TOKEN,
        },
      });

      if (!response.ok) {
        throw await parseApiError(response, 'Failed to fetch deep link options');
      }

      const data = await response.json();
      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        options: Array.isArray(data?.options) && data.options.length ? data.options : NEW_RELEASE_LINK_OPTIONS_DEFAULT,
        targetSegments: Array.isArray(data?.targetSegments) && data.targetSegments.length ? data.targetSegments : NEW_RELEASE_TARGET_SEGMENTS,
        contentTypes: Array.isArray(data?.contentTypes) && data.contentTypes.length ? data.contentTypes : NEW_RELEASE_CONTENT_TYPES,
      };
    } catch (error) {
      console.warn('API Error /breath/notifications/new-releases/link-options:', error);
      return {
        options: NEW_RELEASE_LINK_OPTIONS_DEFAULT,
        targetSegments: NEW_RELEASE_TARGET_SEGMENTS,
        contentTypes: NEW_RELEASE_CONTENT_TYPES,
      };
    }
  },

  async sendNewRelease(data: NewReleasesBlastConfig): Promise<{
    ok?: boolean;
    queued?: boolean;
    campaignId?: string;
    scheduledAt?: string;
    result?: {
      successCount?: number;
      failureCount?: number;
      totalDevices?: number;
      stats?: {
        totalUsers?: number;
        enabledUsers?: number;
        deviceRecords?: number;
        tokenCount?: number;
      };
    };
  }> {
    const headers = {
      ...getHeaders(),
      'x-admin-key': AUTH_TOKEN,
    };

    const payload: Record<string, unknown> = {
      title: data.title,
      body: data.body,
      deepLink: data.deepLink,
      contentType: data.contentType,
      targetSegment: data.targetSegment,
    };

    if (data.scheduleAt) {
      payload.scheduleAt = data.scheduleAt;
    }

    if (data.data && Object.keys(data.data).length > 0) {
      payload.data = data.data;
    }

    const response = await fetch(`${getNotificationsApiUrl()}/breath/notifications/new-releases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'New release send failed');
    }

    return await response.json();
  },

  async sendBroadcast(data: { title: string; body: string; deepLink?: string }): Promise<void> {
    await this.sendNewRelease({
      title: data.title,
      body: data.body,
      deepLink: data.deepLink || '/meditate?tab=guided',
      contentType: 'other',
      targetSegment: 'all-users',
    });
  },

  async updateSettings(settings: any): Promise<void> {
    try {
      const response = await fetch(`${getNotificationsApiUrl()}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Settings update failed');
    } catch (error) {
      console.warn('Settings sync failed:', error);
    }
  }
};
