/**
 * Upload modal – routes to feature-specific forms
 * - Mantras: MantraUploadForm (video-content)
 * - Sleep Music, Meditation, Chakra: MusicUploadForm (musics)
 */
import React from "react";
import { Category } from "../types";
import { MantraUploadForm } from "./upload/MantraUploadForm";
import { MusicUploadForm } from "./upload/MusicUploadForm";

interface UploadModalProps {
  initialCategory?: Category | "";
  onClose: () => void;
  onUploadSuccess?: () => void;
}

const MUSIC_CATEGORIES = [
  Category.SLEEP_MUSIC,
  Category.MEDITATION,
  Category.CHAKRA,
] as const;

const getModalTitle = (category: Category | ""): string => {
  switch (category) {
    case Category.MANTRAS:
      return "Upload Mantra";
    case Category.SLEEP_MUSIC:
      return "Upload Sleep Music";
    case Category.MEDITATION:
      return "Upload Guided Meditation";
    case Category.CHAKRA:
      return "Upload Chakra Music";
    case Category.COURSES:
      return "Upload Course";
    default:
      return "Upload New Content";
  }
};

export const UploadModal: React.FC<UploadModalProps> = ({
  initialCategory = "",
  onClose,
  onUploadSuccess,
}) => {
  const handleSuccess = () => {
    onUploadSuccess?.();
    onClose();
  };

  const isMusicCategory =
    initialCategory &&
    (MUSIC_CATEGORIES as readonly string[]).includes(initialCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-deep-teal/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500"
        role="dialog"
        aria-labelledby="upload-modal-title"
      >
        <div className="bg-sand/30 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <h2 id="upload-modal-title" className="font-serif text-2xl font-bold text-deep-teal">
            {getModalTitle(initialCategory)}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-all"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {initialCategory === Category.MANTRAS && (
            <MantraUploadForm onSuccess={handleSuccess} onCancel={onClose} />
          )}
          {isMusicCategory && (
            <MusicUploadForm
              category={
                initialCategory === Category.SLEEP_MUSIC
                  ? "sleep-music"
                  : initialCategory === Category.MEDITATION
                    ? "meditation"
                    : "chakra"
              }
              onSuccess={handleSuccess}
              onCancel={onClose}
            />
          )}
          {initialCategory === Category.COURSES && (
            <div className="text-slate-500 text-center py-8">
              Course upload – configure as needed.
            </div>
          )}
          {!initialCategory && (
            <div className="text-slate-500 text-center py-8">
              Select Sleep Music, Meditation, Mantras, or Chakra from the sidebar
              and click Upload.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
