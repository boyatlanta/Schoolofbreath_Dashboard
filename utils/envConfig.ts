/**
 * Environment configuration for dev vs prod.
 * Content + Courses: api-music-iota (prod) / dev-api-music-iota (dev)
 * Notifications: breathing-ejercices-api (prod) - same for both unless dev URL exists
 * Override via .env.local: VITE_CONTENT_API_DEV, VITE_CONTENT_API_PROD, etc.
 */
export type Environment = 'dev' | 'prod';

const STORAGE_KEY = 'sb_admin_environment';

const def = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);

const URLS: Record<Environment, { content: string; courses: string; notifications: string }> = {
  dev: {
    content: def(import.meta.env.VITE_CONTENT_API_DEV, 'https://dev-api-music-iota.vercel.app'),
    courses: def(import.meta.env.VITE_COURSES_API_DEV, 'https://dev-api-music-iota.vercel.app'),
    notifications: def(import.meta.env.VITE_NOTIFICATIONS_API, 'https://breathing-ejercices-api.vercel.app'),
  },
  prod: {
    content: def(import.meta.env.VITE_CONTENT_API_PROD, 'https://api-music-iota.vercel.app'),
    courses: def(import.meta.env.VITE_COURSES_API_PROD, 'https://api-music-iota.vercel.app'),
    notifications: def(import.meta.env.VITE_NOTIFICATIONS_API, 'https://breathing-ejercices-api.vercel.app'),
  },
};

export function getEnvironment(): Environment {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dev' || stored === 'prod') return stored;
  return 'prod';
}

export function setEnvironment(env: Environment): void {
  localStorage.setItem(STORAGE_KEY, env);
  window.dispatchEvent(new CustomEvent('sb-env-changed', { detail: env }));
}

export function getContentApiUrl(): string {
  return URLS[getEnvironment()].content;
}

export function getCoursesApiUrl(): string {
  return URLS[getEnvironment()].courses;
}

export function getNotificationsApiUrl(): string {
  return URLS[getEnvironment()].notifications;
}
