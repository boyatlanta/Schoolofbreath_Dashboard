import { ChevronRight, Lock, PlusCircle, Trash2, Unlock } from 'lucide-react';
import { Course, Section } from '../../models/courses.models';
import { useState } from 'react';

interface LessonEditorProps {
  courseData: Course;
  onUpdate: (sections: Section[]) => void;
  allowSectionModification: boolean;
}

export function LessonEditor({
  courseData,
  onUpdate,
  allowSectionModification,
}: LessonEditorProps) {
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleAddSection = () => {
    onUpdate([
      ...courseData.sections,
      { section: '', lessons: [], isPremium: true },
    ]);
  };

  const handleRemoveSection = (sectionIndex: number) => {
    onUpdate(courseData.sections.filter((_, i) => i !== sectionIndex));
  };

  const handleAddLesson = (sectionIndex: number) => {
    const newSections = [...courseData.sections];
    newSections[sectionIndex].lessons.push({
      id: Date.now().toString(),
      title: '',
      videoUrl: '',
      type: 'video',
      isFromYoutube: false,
      isPremium: true,
    });
    onUpdate(newSections);
  };

  const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
    const newSections = [...courseData.sections];
    newSections[sectionIndex].lessons.splice(lessonIndex, 1);
    onUpdate(newSections);
  };

  const handleLessonChange = (
    sectionIndex: number,
    lessonIndex: number,
    field: string,
    value: unknown
  ) => {
    const newSections = [...courseData.sections];
    newSections[sectionIndex].lessons[lessonIndex] = {
      ...newSections[sectionIndex].lessons[lessonIndex],
      [field]: value,
    };
    onUpdate(newSections);
  };

  const toggleSectionPremium = (sectionIndex: number) => {
    const newSections = [...courseData.sections];
    const currentPremium = newSections[sectionIndex].isPremium ?? true;
    newSections[sectionIndex].isPremium = !currentPremium;
    newSections[sectionIndex].lessons = newSections[sectionIndex].lessons.map((lesson) => ({
      ...lesson,
      isPremium: !currentPremium,
    }));
    onUpdate(newSections);
  };

  const toggleLessonPremium = (sectionIndex: number, lessonIndex: number) => {
    const newSections = [...courseData.sections];
    const lesson = newSections[sectionIndex].lessons[lessonIndex];
    lesson.isPremium = !(lesson.isPremium ?? true);
    onUpdate(newSections);
  };

  return (
    <div className="space-y-6">
      {allowSectionModification && (
        <button
          onClick={handleAddSection}
          className="inline-flex items-center px-4 py-2 bg-teal-primary text-white rounded-xl font-medium hover:bg-teal-primary/90"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add New Section
        </button>
      )}

      <div>
        {courseData.sections.map((section, sectionIndex) => {
          const sectionId = `section-${sectionIndex}`;
          const isOpen = openSections.includes(sectionId);
          const isSectionPremium = section.isPremium ?? true;

          return (
            <div
              key={sectionIndex}
              className="border border-slate-200 rounded-xl mb-4 overflow-hidden bg-white"
            >
              <div
                className="flex items-center p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleSection(sectionId)}
              >
                <div className="flex-1 flex items-center">
                  <input
                    type="text"
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none"
                    value={section.section}
                    onChange={(e) => {
                      if (allowSectionModification) {
                        const newSections = [...courseData.sections];
                        newSections[sectionIndex].section = e.target.value;
                        onUpdate(newSections);
                      }
                    }}
                    readOnly={!allowSectionModification}
                    placeholder="Section Title"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSectionPremium(sectionIndex);
                    }}
                    className={`ml-2 p-1.5 rounded-lg ${
                      isSectionPremium ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                    title={isSectionPremium ? 'Premium Content' : 'Free Content'}
                  >
                    {isSectionPremium ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{section.lessons.length} lessons</span>
                  {allowSectionModification && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSection(sectionIndex);
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {isOpen && (
                <div className="p-4 border-t border-slate-100 bg-white">
                  <div className="space-y-4">
                    {section.lessons.map((lesson, lessonIndex) => {
                      const isLessonPremium = lesson.isPremium ?? true;
                      return (
                        <div
                          key={lesson.id}
                          className="bg-slate-50 rounded-xl border border-slate-100 p-4"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center">
                              <h4 className="font-medium text-deep-teal">Lesson {lessonIndex + 1}</h4>
                              <button
                                onClick={() => toggleLessonPremium(sectionIndex, lessonIndex)}
                                className={`ml-2 p-1.5 rounded-lg ${
                                  isLessonPremium ? 'text-amber-600' : 'text-emerald-600'
                                }`}
                                title={isLessonPremium ? 'Premium' : 'Free'}
                              >
                                {isLessonPremium ? (
                                  <Lock className="w-4 h-4" />
                                ) : (
                                  <Unlock className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveLesson(sectionIndex, lessonIndex)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Title
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded-xl p-2.5"
                                value={lesson.title}
                                onChange={(e) =>
                                  handleLessonChange(sectionIndex, lessonIndex, 'title', e.target.value)
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Content Type
                              </label>
                              <select
                                className="w-full border border-slate-300 rounded-xl p-2.5"
                                value={lesson.type || 'video'}
                                onChange={(e) =>
                                  handleLessonChange(
                                    sectionIndex,
                                    lessonIndex,
                                    'type',
                                    e.target.value as 'video' | 'audio' | 'file'
                                  )
                                }
                              >
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                                <option value="file">File</option>
                              </select>
                            </div>

                            {lesson.type === 'video' && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Video Source
                                  </label>
                                  <select
                                    className="w-full border border-slate-300 rounded-xl p-2.5"
                                    value={lesson.isFromYoutube ? 'youtube' : 'direct'}
                                    onChange={(e) =>
                                      handleLessonChange(
                                        sectionIndex,
                                        lessonIndex,
                                        'isFromYoutube',
                                        e.target.value === 'youtube'
                                      )
                                    }
                                  >
                                    <option value="direct">Direct URL</option>
                                    <option value="youtube">YouTube</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Video URL
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-xl p-2.5"
                                    value={lesson.videoUrl || ''}
                                    onChange={(e) =>
                                      handleLessonChange(
                                        sectionIndex,
                                        lessonIndex,
                                        'videoUrl',
                                        e.target.value
                                      )
                                    }
                                    placeholder={
                                      lesson.isFromYoutube ? 'YouTube URL' : 'Direct video URL'
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {lesson.type === 'audio' && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Audio URL (MP3)
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-xl p-2.5"
                                    value={lesson.audioUrl || ''}
                                    onChange={(e) =>
                                      handleLessonChange(
                                        sectionIndex,
                                        lessonIndex,
                                        'audioUrl',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter MP3 file URL"
                                  />
                                </div>
                                {lesson.audioUrl && (
                                  <div className="bg-white rounded-xl p-2 border border-slate-200">
                                    <audio controls className="w-full" src={lesson.audioUrl}>
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                              </div>
                            )}

                            {lesson.type === 'file' && (
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  File URL
                                </label>
                                <input
                                  type="text"
                                  className="w-full border border-slate-300 rounded-xl p-2.5"
                                  value={lesson.file || ''}
                                  onChange={(e) =>
                                    handleLessonChange(
                                      sectionIndex,
                                      lessonIndex,
                                      'file',
                                      e.target.value
                                    )
                                  }
                                  placeholder="File URL"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => handleAddLesson(sectionIndex)}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:border-teal-primary/30 flex items-center justify-center font-medium"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add New Lesson
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
