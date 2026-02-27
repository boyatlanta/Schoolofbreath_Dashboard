
import React, { useState } from 'react';
import { authService } from '../services/authService';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay
    setTimeout(() => {
      if (authService.login(email, password)) {
        onLoginSuccess();
      } else {
        setError('Invalid credentials. Please check your email and password.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-gradient-to-br from-deep-teal to-teal-primary p-10 text-center text-white">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
            <span className="text-4xl">🌬️</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-widest uppercase mb-2">School of Breath</h1>
          <p className="text-xs tracking-[2px] uppercase opacity-60">Admin Portal Access</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-teal-primary uppercase tracking-widest">Admin Email</label>
            <input 
              type="email" 
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all font-medium"
              placeholder="abhishekdug@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-teal-primary uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none transition-all font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-teal-primary text-white font-bold rounded-2xl shadow-lg hover:shadow-teal-primary/20 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Enter Dashboard'
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400 font-medium">
            Protected administrative area. Unauthorized access is restricted.
          </p>
        </form>
      </div>
    </div>
  );
};
