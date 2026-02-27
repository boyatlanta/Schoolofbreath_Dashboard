
export const authService = {
  login: (email: string, password: string): boolean => {
    // Hardcoded credentials as requested for the demonstration
    // In a real production app, this would be a POST request to your API
    if (email === 'abhishekdug@gmail.com' && password === 'breath2024') {
      localStorage.setItem('sb_admin_session', 'authenticated');
      localStorage.setItem('sb_admin_user', email);
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('sb_admin_session');
    localStorage.removeItem('sb_admin_user');
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem('sb_admin_session') === 'authenticated';
  },

  getUser: (): string | null => {
    return localStorage.getItem('sb_admin_user');
  }
};
