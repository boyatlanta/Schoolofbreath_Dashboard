import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ContentManager } from './components/ContentManager';
import { CoursesPage } from './components/courses/CoursesPage';
import { Notifications } from './components/Notifications';
import { UploadModal } from './components/UploadModal';
import { Login } from './components/Login';
import { Category } from './types';
import { authService } from './services/authService';

const MainLayout: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [preSelectedCategory, setPreSelectedCategory] = useState<Category | ''>('');
  const [contentRefreshKey, setContentRefreshKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  const handleUploadSuccess = () => {
    setContentRefreshKey((k) => k + 1);
    setIsUploadModalOpen(false);
  };

  // Check auth on mount and periodically
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated());
    };
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Refresh content when API environment (dev/prod) switches
  useEffect(() => {
    const handler = () => setContentRefreshKey((k) => k + 1);
    window.addEventListener('sb-env-changed', handler);
    return () => window.removeEventListener('sb-env-changed', handler);
  }, []);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const handleOpenUpload = (category: Category | '' = '') => {
    setPreSelectedCategory(category);
    setIsUploadModalOpen(true);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onLogout={handleLogout} />
      
      <main className="flex-1 ml-0 lg:ml-72 p-6 transition-all duration-300">
        <Routes>
          <Route path="/" element={<Dashboard onOpenUpload={handleOpenUpload} />} />
          <Route path="/sleep-music" element={<ContentManager category={Category.SLEEP_MUSIC} refreshKey={contentRefreshKey} onOpenUpload={() => handleOpenUpload(Category.SLEEP_MUSIC)} />} />
          <Route path="/meditation" element={<ContentManager category={Category.MEDITATION} refreshKey={contentRefreshKey} onOpenUpload={() => handleOpenUpload(Category.MEDITATION)} />} />
          <Route path="/mantras" element={<ContentManager category={Category.MANTRAS} refreshKey={contentRefreshKey} onOpenUpload={() => handleOpenUpload(Category.MANTRAS)} />} />
          <Route path="/chakra" element={<ContentManager category={Category.CHAKRA} refreshKey={contentRefreshKey} onOpenUpload={() => handleOpenUpload(Category.CHAKRA)} />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isUploadModalOpen && (
        <UploadModal
          key={preSelectedCategory || 'upload'}
          initialCategory={preSelectedCategory}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <MainLayout />
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
};

export default App;
