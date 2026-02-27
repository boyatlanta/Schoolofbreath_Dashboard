import { Edit, Loader, PlusCircle, Trash2, X } from 'lucide-react';
import { ThemeCustomizer } from './ThemeCustomizer';
import { useMutation, useQuery } from '@tanstack/react-query';
import { themeService } from '../../../services/themeService';
import { useState } from 'react';
import type { ThemeColors } from '../../../models/theme.models';
import type { Theme } from '../../../models/theme.models';
import { toast } from 'react-toastify';

interface ThemeManagementModalProps {
  onClose: () => void;
  onSelectTheme: (themeId: string) => void;
}

export function ThemeManagementModal({ onClose, onSelectTheme }: ThemeManagementModalProps) {
  const { data: themes = [], isLoading, refetch } = useQuery({
    queryKey: ['themes'],
    queryFn: themeService.getThemes,
    refetchOnWindowFocus: false,
  });
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

  const createMutation = useMutation({
    mutationFn: (themeData: { name: string; colors: ThemeColors }) =>
      themeService.createTheme(themeData),
    onSuccess: () => {
      refetch();
      toast.success('Theme created!', { position: 'top-right', autoClose: 3000 });
    },
    onError: () => toast.error('Failed to create theme', { position: 'top-right', autoClose: 3000 }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; theme: { name: string; colors: ThemeColors } }) =>
      themeService.updateTheme(data.id, data.theme),
    onSuccess: () => {
      refetch();
      toast.success('Theme updated!', { position: 'top-right', autoClose: 3000 });
    },
    onError: () => toast.error('Failed to update theme', { position: 'top-right', autoClose: 3000 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (themeId: string) => themeService.deleteTheme(themeId),
    onSuccess: () => refetch(),
    onError: () =>
      toast.error('Failed to delete theme', { position: 'top-right', autoClose: 3000 }),
  });

  const handleDeleteTheme = async (themeId: string) => {
    try {
      await deleteMutation.mutateAsync(themeId);
      toast.success('Theme deleted!', { position: 'top-right', autoClose: 3000 });
    } catch {
      // Error handled in mutation
    }
  };

  const confirmDelete = (themeId: string) => {
    toast.warn(
      <div>
        <p className="font-medium">Delete Theme?</p>
        <p className="text-sm mt-1">This action cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => toast.dismiss()}
            className="px-3 py-1 text-sm bg-slate-200 rounded-md hover:bg-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss();
              handleDeleteTheme(themeId);
            }}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>,
      { position: 'top-center', autoClose: false, closeButton: false, closeOnClick: false }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-deep-teal">Theme Management</h2>
            <p className="text-sm text-slate-500">Create, edit, or select a theme for your course</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCustomizer(true)}
              className="inline-flex items-center px-4 py-2 bg-teal-primary text-white rounded-xl hover:bg-teal-primary/90 font-medium"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Theme
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader className="w-8 h-8 animate-spin text-teal-primary" />
          </div>
        ) : (
          <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((theme: Theme) => (
              <div
                key={theme._id}
                className="border border-slate-200 rounded-xl p-4 hover:border-teal-primary/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-deep-teal">{theme.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTheme(theme)}
                      className="p-1.5 text-teal-primary hover:bg-teal-primary/10 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!theme.isDefault && (
                      <button
                        onClick={() => confirmDelete(theme._id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => {
                    onSelectTheme(theme._id);
                    onClose();
                  }}
                >
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {Object.entries(theme.colors)
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
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: theme.colors.backgroundColor }}
                  >
                    <div
                      className="rounded p-2"
                      style={{ backgroundColor: theme.colors.headerColor }}
                    >
                      <span style={{ color: theme.colors.courseTitleColor }}>Preview</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(showCustomizer || editingTheme) && (
          <ThemeCustomizer
            onClose={() => {
              setShowCustomizer(false);
              setEditingTheme(null);
            }}
            initialTheme={editingTheme?.colors}
            initialName={editingTheme?.name}
            onSave={async (themeData) => {
              if (editingTheme) {
                await updateMutation.mutateAsync({ id: editingTheme._id, theme: themeData });
              } else {
                await createMutation.mutateAsync(themeData);
              }
              setShowCustomizer(false);
              setEditingTheme(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
