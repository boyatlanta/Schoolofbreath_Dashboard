import { useEffect, useState } from 'react';
import { Course } from '../../models/courses.models';
import { Tag, TagSelector } from './TagSelector';
import { useQuery } from '@tanstack/react-query';
import { ThemeManagementModal } from './theme/ThemeManagementModal';
import { Loader, PlusCircle } from 'lucide-react';
import { themeService } from '../../services/themeService';

interface CourseConfiguratorProps {
  courseData: Course;
  onChange: (data: Course) => void;
  onNext: () => void;
}

const AVAILABLE_TAGS: Tag[] = [
  { id: '1', name: 'Enrolled_Holistic Membership', type: 'full' },
  { id: '2', name: 'Enrolled_to_Sleep_Membership', type: 'limited' },
  { id: '3', name: 'Purchased_9-Day Breathwork Course', type: 'limited' },
  { id: '4', name: 'Purchased_9-Day Meditation Course', type: 'limited' },
  { id: '5', name: 'Purchased_Swara_Yoga_Course', type: 'limited' },
  { id: '6', name: 'Purchased_9-Day Bliss Course', type: 'limited' },
  { id: '7', name: 'Purchased_12-Day ThirdEye Course', type: 'limited' },
  { id: '8', name: 'Purchased_Kundalini Course', type: 'limited' },
  { id: '9', name: 'Purchased_Decision_Making_Course', type: 'limited' },
  { id: '10', name: 'Purchased_Yoga_Course', type: 'limited' },
];

export function CourseConfigurator({ courseData, onChange, onNext }: CourseConfiguratorProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showThemeManager, setShowThemeManager] = useState(false);

  const { data: themes = [], isLoading: loadingThemes } = useQuery({
    queryKey: ['themes'],
    queryFn: themeService.getThemes,
    refetchOnWindowFocus: false,
  });

  const selectedTheme = themes.find((t: { _id: string }) => t._id === courseData.courseTheme);

  useEffect(() => {
    if (courseData.accessTags?.length) {
      setSelectedTags(courseData.accessTags);
    }
  }, [courseData.accessTags]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deep-teal mb-4">Configure Course Details</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Title*</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-primary"
            value={courseData.title}
            onChange={(e) => onChange({ ...courseData, title: e.target.value })}
            placeholder="e.g., 9-Day Breathwork for Unconditional Bliss"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Description*</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-primary"
            value={courseData.description}
            onChange={(e) => onChange({ ...courseData, description: e.target.value })}
            placeholder="e.g., COMING IN AUGUST"
          />
        </div>

        <div className="col-span-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">Course Theme</label>
            <button
              onClick={() => setShowThemeManager(true)}
              className="text-sm text-teal-primary hover:text-teal-primary/80 font-medium"
            >
              Manage Themes
            </button>
          </div>
          {loadingThemes ? (
            <div className="flex justify-center p-8 border border-slate-200 rounded-xl">
              <Loader className="w-6 h-6 animate-spin text-teal-primary" />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-4">
              {selectedTheme ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-deep-teal">{selectedTheme.name}</h3>
                    <button
                      onClick={() => setShowThemeManager(true)}
                      className="text-sm text-teal-primary hover:text-teal-primary/80 font-medium"
                    >
                      Change Theme
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(selectedTheme.colors)
                      .slice(0, 5)
                      .map(([key, color]) => (
                        <div
                          key={key}
                          className="w-6 h-6 rounded-full border border-slate-200"
                          style={{ backgroundColor: color as string }}
                          title={key.replace(/([A-Z])/g, ' $1').trim()}
                        />
                      ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowThemeManager(true)}
                  className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:border-teal-primary/30 transition-colors flex flex-col items-center"
                >
                  <PlusCircle className="w-8 h-8 mb-2" />
                  Select a Theme
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type*</label>
          <input
            type="text"
            className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
            value={courseData.type}
            readOnly
            placeholder="Breathwork"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Days*</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-primary"
            value={courseData.days}
            onChange={(e) => onChange({ ...courseData, days: e.target.value })}
            placeholder="e.g., 9"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-primary"
            value={courseData.time}
            onChange={(e) => onChange({ ...courseData, time: e.target.value })}
            placeholder="Watch At Your Own Pace"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Image URL*</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-primary"
            value={courseData.image}
            onChange={(e) => onChange({ ...courseData, image: e.target.value })}
            placeholder="https://storage.googleapis.com/schoolbreathvideos/images/..."
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-deep-teal mb-4">Course Access Configuration</h3>
        <TagSelector
          availableTags={AVAILABLE_TAGS}
          selectedTags={selectedTags}
          onChange={(tags) => {
            setSelectedTags(tags);
            onChange({ ...courseData, accessTags: tags });
          }}
          courseId={courseData.id}
        />
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
        <button
          className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
          onClick={() => onChange({ ...courseData, sections: [] })}
        >
          Clear Form
        </button>
        <button
          className="px-6 py-2.5 bg-teal-primary text-white rounded-xl hover:bg-teal-primary/90 font-medium"
          onClick={onNext}
        >
          Continue to Lesson Setup
        </button>
      </div>

      {showThemeManager && (
        <ThemeManagementModal
          onClose={() => setShowThemeManager(false)}
          onSelectTheme={(themeId) => onChange({ ...courseData, courseTheme: themeId })}
        />
      )}
    </div>
  );
}
