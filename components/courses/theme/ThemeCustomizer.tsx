import { useState } from 'react';
import { Loader, X } from 'lucide-react';
import type { ThemeColors } from '../../../models/theme.models';

const DEFAULT_COLORS: ThemeColors = {
  primaryColor: '#4A90E2',
  secondaryColor: '#CCFFFF',
  backgroundColor: '#FFFFFF',
  textColor: '#000000',
  accentColor: '#FFD700',
  headerColor: '#4A90E2',
  courseTitleColor: '#FFFFFF',
  instructorTextColor: '#FFFFFF',
  tabBackgroundColor: '#CCFFFF',
  dayBackgroundColor: '#F0FFFF',
  sectionBackgroundColor: '#F0FFFF',
  subsectionBackgroundColor: '#FFFFFF',
  lessonBackgroundColor: '#FFFFFF',
  reviewBackgroundColor: '#F8F8F8',
  descriptionColor: '#888888',
};

interface ThemeCustomizerProps {
  onClose: () => void;
  onSave: (theme: { name: string; colors: ThemeColors }) => void | Promise<void>;
  initialTheme?: ThemeColors;
  initialName?: string;
}

export function ThemeCustomizer({ onClose, onSave, initialTheme, initialName }: ThemeCustomizerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [themeName, setThemeName] = useState(initialName || '');
  const [colors, setColors] = useState<ThemeColors>(initialTheme || DEFAULT_COLORS);

  const handleSave = async () => {
    if (!themeName.trim()) return;
    setIsLoading(true);
    try {
      await onSave({ name: themeName, colors });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-deep-teal">Create Custom Theme</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Theme Name*</label>
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-primary focus:border-teal-primary"
              placeholder="Enter theme name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(colors).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="h-10 w-10 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-teal-primary"
                    placeholder="#000000"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !themeName.trim()}
              className="px-4 py-2 bg-teal-primary text-white rounded-xl hover:bg-teal-primary/90 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
              Save Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
