import { getCoursesApiUrl } from '../utils/coursesApi.config';
import type { ThemeColors } from '../models/theme.models';

export const themeService = {
  getThemes: async () => {
    const res = await fetch(`${getCoursesApiUrl()}/themes`);
    if (!res.ok) throw new Error('Failed to fetch themes');
    return res.json();
  },

  createTheme: async (themeData: { name: string; colors: ThemeColors }) => {
    const response = await fetch(`${getCoursesApiUrl()}/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(themeData),
    });
    if (!response.ok) throw new Error('Failed to create theme');
    return response.json();
  },

  updateTheme: async (id: string, themeData: { name: string; colors: ThemeColors }) => {
    const response = await fetch(`${getCoursesApiUrl()}/themes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(themeData),
    });
    if (!response.ok) throw new Error('Failed to update theme');
    return response.json();
  },

  deleteTheme: async (id: string) => {
    const response = await fetch(`${getCoursesApiUrl()}/themes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete theme');
    return response.json();
  },
};
