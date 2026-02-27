import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateEngagementSummary } from '../services/insightsService';
import { fetchDashboardData } from '../services/dashboardService';
import { Category, ContentItem, StatItem } from '../types';

const StatCard: React.FC<{ item: StatItem }> = ({ item }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="text-3xl font-serif font-bold text-deep-teal mb-1">{item.value}</div>
        <div className="text-sm text-slate-500 font-medium">{item.label}</div>
      </div>
      <div className={`${item.colorClass} w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform`}>
        {item.icon}
      </div>
    </div>
    <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
      {item.change}
    </div>
  </div>
);

const formatPlays = (n: number, display?: string): string => {
  if (display) return display;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const ContentCategoryCard: React.FC<{ 
  title: string; 
  subtitle: string; 
  icon: string; 
  color: string;
  count: number;
  plays: number;
  playsDisplay?: string;
  onManage: () => void;
  onUpload: () => void;
}> = ({ title, subtitle, icon, color, count, plays, playsDisplay, onManage, onUpload }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-teal-light/20 transition-all duration-300">
    <div className="flex items-center gap-4 mb-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-serif text-lg font-bold text-deep-teal">{title}</h3>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{subtitle}</p>
      </div>
    </div>
    
      <div className="flex gap-4 mb-6 py-4 border-y border-slate-50">
      <div className="flex-1">
        <div className="font-serif text-xl font-bold text-deep-teal">{count}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Items</div>
      </div>
      <div className="flex-1">
        <div className="font-serif text-xl font-bold text-deep-teal">{formatPlays(plays, playsDisplay)}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Total Plays</div>
      </div>
    </div>

    <div className="flex gap-2">
      <button onClick={onManage} className="flex-1 py-2 text-xs font-bold text-teal-primary border border-teal-light/30 rounded-lg hover:bg-teal-primary hover:text-white transition-colors">
        Manage
      </button>
      <button onClick={onUpload} className="flex-1 py-2 text-xs font-bold text-white bg-teal-primary rounded-lg shadow-sm hover:shadow-md transition-all">
        Upload
      </button>
    </div>
  </div>
);

export const Dashboard: React.FC<{ onOpenUpload: (category?: Category | '') => void }> = ({ onOpenUpload }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState("Gathering latest insights...");
  const [stats, setStats] = useState<StatItem[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, { count: number; plays: number; playsDisplay?: string }>>({});
  const [recentActivity, setRecentActivity] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardData();
      setStats(data.stats);
      setCategoryStats(data.categoryStats);
      setRecentActivity(data.recentActivity);

      try {
        const { getContentApiUrl } = await import('../utils/contentApi.config');
        const check = await fetch(`${getContentApiUrl()}/categories/admin`, { method: 'HEAD' });
        setIsLive(check.ok);
      } catch {
        setIsLive(false);
      }

      const generatedSummary = await generateEngagementSummary(data.stats);
      setSummary(generatedSummary);
    } catch (error) {
      console.error("Dashboard component error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const handler = () => loadDashboard();
    window.addEventListener('sb-env-changed', handler);
    return () => window.removeEventListener('sb-env-changed', handler);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
        <div className="text-6xl mb-4">🌬️</div>
        <p className="font-serif text-xl text-teal-primary">Connecting to the School of Breath...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-serif text-3xl font-bold text-deep-teal">Welcome Back, Admin</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isLive ? '● Live Production' : '○ Local/Offline'}
            </span>
          </div>
          <p className="text-slate-500 font-medium">Here's what's happening at The School of Breath today.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm"
          >
            Refresh
          </button>
          <button onClick={() => onOpenUpload()} className="px-6 py-2.5 bg-teal-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2">
            <span>+</span> Upload Content
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-r from-teal-primary/5 to-lavender/10 border border-teal-light/10 p-4 rounded-xl mb-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">💡</div>
        <div className="flex-1">
          <p className="text-xs font-bold text-teal-primary uppercase tracking-widest mb-0.5">Insights Summary</p>
          <p className="text-sm text-slate-600 italic font-medium">"{summary}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => <StatCard key={i} item={stat} />)}
      </div>

      <h2 className="font-serif text-2xl font-bold text-deep-teal mb-6 flex items-center gap-3">
        <span className="p-2 bg-white rounded-lg shadow-sm">📁</span> Content Management
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <ContentCategoryCard 
          title="Sleep Music" subtitle="Rest & Relaxation" icon="🌙" color="bg-mint" 
          count={categoryStats[Category.SLEEP_MUSIC]?.count ?? 0} 
          plays={categoryStats[Category.SLEEP_MUSIC]?.plays ?? 0} 
          onManage={() => navigate('/sleep-music')} onUpload={() => onOpenUpload(Category.SLEEP_MUSIC)}
        />
        <ContentCategoryCard 
          title="Meditation" subtitle="Guided Sessions" icon="🧘" color="bg-lavender" 
          count={categoryStats[Category.MEDITATION]?.count ?? 0} 
          plays={categoryStats[Category.MEDITATION]?.plays ?? 0} 
          onManage={() => navigate('/meditation')} onUpload={() => onOpenUpload(Category.MEDITATION)}
        />
        <ContentCategoryCard 
          title="Mantras" subtitle="Chant & Repeat" icon="🕉️" color="bg-peach" 
          count={categoryStats[Category.MANTRAS]?.count ?? 0} 
          plays={categoryStats[Category.MANTRAS]?.plays ?? 0} 
          onManage={() => navigate('/mantras')} onUpload={() => onOpenUpload(Category.MANTRAS)}
        />
        <ContentCategoryCard 
          title="Chakra Music" subtitle="Energy Healing" icon="✨" color="bg-gold-light" 
          count={categoryStats[Category.CHAKRA]?.count ?? 0} 
          plays={categoryStats[Category.CHAKRA]?.plays ?? 0} 
          onManage={() => navigate('/chakra')} onUpload={() => onOpenUpload(Category.CHAKRA)}
        />
        <ContentCategoryCard 
          title="My Courses" subtitle="Structured Learning" icon="📖" color="bg-sage" 
          count={categoryStats.courses?.count ?? 0} 
          plays={categoryStats.courses?.plays ?? 0} 
          onManage={() => navigate('/courses')} onUpload={() => navigate('/courses')}
        />
        <ContentCategoryCard 
          title="Engagement" subtitle="Notifications" icon="🔔" color="bg-sand" 
          count={categoryStats.notifications?.count ?? 0} 
          plays={0} playsDisplay={categoryStats.notifications?.playsDisplay} 
          onManage={() => navigate('/notifications')} onUpload={() => navigate('/notifications')}
        />
      </div>

      <h2 className="font-serif text-2xl font-bold text-deep-teal mb-6 flex items-center gap-3">
        <span className="p-2 bg-white rounded-lg shadow-sm">🕒</span> Recent Activity
      </h2>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-12 border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-sand/30 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Title</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentActivity.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.title}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 capitalize">{item.category.replace('-', ' ')}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">{item.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.duration}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                      item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                      item.status === 'Draft' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-teal-primary hover:text-white transition-all">✏️</button>
                      <button className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-teal-primary hover:text-white transition-all">▶️</button>
                      <button className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
