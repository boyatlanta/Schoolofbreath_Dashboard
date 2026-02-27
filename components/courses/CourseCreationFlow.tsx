import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Loader } from 'lucide-react';
import { Course, Section } from '../../models/courses.models';
import { CourseConfigurator } from './CourseConfigurator';
import { LessonEditor } from './LessonEditor';
import {
  createCourse,
  fetchExistingCourse,
  fetchScratchCourses,
  updateCourse,
  type CreationMethod,
} from '../../services/coursesService';
import { MethodSelector } from './CourseCreationMethod';
import { ScratchCourseSelector } from './ScratchCourseSelector';
import { toast, ToastContainer } from 'react-toastify';
import { NavigationButtons } from './NavigationButtons';
import { getCoursesApiUrl } from '../../utils/coursesApi.config';
import 'react-toastify/dist/ReactToastify.css';

const DEFAULT_AUTHOR = {
  name: 'Abhi Duggal, your breathwork coach.',
  bio: 'Abhi Duggal, a renowned holistic health expert...',
  profileImage: 'https://storage.googleapis.com/schoolbreathvideos/images/Abhi.jpg',
};

const fetchSystemeIoCourses = async () => {
  const response = await fetch(`${getCoursesApiUrl()}/courses/usersystemeio`);
  if (!response.ok) throw new Error('Failed to fetch courses');
  return response.json();
};

interface CourseSelectorProps {
  onSelect: (course: { id: number; name: string; modules: { name: string }[] }) => void;
  isLoading: boolean;
  courses: { courses?: { id: number; name: string; modules: { name: string }[] }[] };
}

function CourseSelector({ onSelect, isLoading, courses }: CourseSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const list = courses?.courses ?? [];
  const filtered = list.filter((c: { name: string }) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-deep-teal">Select Course from Systeme.io</h2>
        <div className="w-64 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader className="w-6 h-6 animate-spin text-teal-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course: { id: number; name: string; modules: { name: string }[] }) => (
            <div
              key={course.id}
              className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 flex justify-between items-center"
            >
              <div>
                <h3 className="font-medium text-deep-teal">{course.name}</h3>
                <p className="text-sm text-slate-500">{course.modules?.length ?? 0} modules</p>
              </div>
              <button
                className="px-4 py-2 bg-teal-primary text-white rounded-xl font-medium hover:bg-teal-primary/90"
                onClick={() => onSelect(course)}
              >
                Select
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_COURSE: Course = {
  id: '',
  creationMethod: 'fromScratch',
  title: '',
  description: '',
  image: '',
  type: 'Breathwork',
  days: '',
  time: 'Watch At Your Own Pace',
  courseTheme: '',
  reviews: [],
  author: DEFAULT_AUTHOR,
  sections: [],
};

export function CourseCreationFlow() {
  const [step, setStep] = useState(1);
  const [creationMethod, setCreationMethod] = useState<CreationMethod | null>(null);
  const [courseData, setCourseData] = useState<Course>(DEFAULT_COURSE);

  const { data: systemeIoCourses = { courses: [] }, isLoading: isLoadingSystemio } = useQuery({
    queryKey: ['systemeio-courses'],
    queryFn: fetchSystemeIoCourses,
    enabled: creationMethod === 'fromSystemeio',
    refetchOnWindowFocus: false,
  });

  const { data: scratchCourses = [], isLoading: isLoadingScratch } = useQuery({
    queryKey: ['scratch-courses'],
    queryFn: fetchScratchCourses,
    enabled: creationMethod === 'fromScratch',
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { courseData: Course; creationMethod: CreationMethod }) =>
      data.courseData._id ? updateCourse(data) : createCourse(data),
    onSuccess: () => toast.success('Course saved successfully!'),
    onError: () => toast.error('Failed to save course'),
  });

  const handleMethodSelect = (method: CreationMethod) => {
    setCreationMethod(method);
    if (method === 'fromScratch') setStep(1.25);
    else if (method === 'fromSystemeio') setStep(1.5);
  };

  const handleCreateNew = () => {
    setCourseData({
      ...DEFAULT_COURSE,
      id: Date.now().toString(),
      creationMethod: creationMethod || 'fromScratch',
      author: DEFAULT_AUTHOR,
    });
    setStep(2);
  };

  const handleCourseSelect = async (course: { id: number; name: string; modules: { name: string }[] }) => {
    const existing = await fetchExistingCourse(course.id.toString());
    if (existing) {
      setCourseData({
        ...existing,
        id: existing.systemeIoId || existing.id,
        creationMethod: 'fromSystemeio',
      });
    } else {
      setCourseData((prev) => ({
        ...prev,
        id: course.id.toString(),
        systemeIoId: course.id.toString(),
        title: course.name,
        creationMethod: 'fromSystemeio',
        author: DEFAULT_AUTHOR,
        sections: (course.modules ?? []).map((m: { name: string }) => ({
          section: m.name,
          lessons: [],
        })),
      }));
    }
    setStep(2);
  };

  const handleSave = async () => {
    if (!courseData.creationMethod) {
      toast.error('Creation method not specified');
      return;
    }
    await saveMutation.mutateAsync({
      courseData,
      creationMethod: courseData.creationMethod,
    });
    window.location.reload();
  };

  const handleSectionsUpdate = (newSections: Section[]) => {
    setCourseData((prev) => ({ ...prev, sections: newSections }));
  };

  const steps = [
    { number: 1, title: 'Select Method', canNavigate: true },
    {
      number: creationMethod === 'fromScratch' ? 1.25 : 1.5,
      title: 'Select Course',
      canNavigate: true,
    },
    { number: 2, title: 'Course Details', canNavigate: courseData.id !== '' },
    { number: 3, title: 'Configure Lessons', canNavigate: courseData.title !== '' },
  ];

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Step breadcrumb */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center">
                {i > 0 && <span className="mx-2 text-slate-300">›</span>}
                <span
                  className={
                    step >= s.number
                      ? 'font-medium text-teal-primary'
                      : 'text-slate-400'
                  }
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && <MethodSelector onSelect={handleMethodSelect} />}

          {step === 1.25 && creationMethod === 'fromScratch' && (
            <ScratchCourseSelector
              onSelect={(course) => {
                setCourseData(course);
                setStep(2);
              }}
              onCreateNew={handleCreateNew}
              isLoading={isLoadingScratch}
              courses={scratchCourses}
            />
          )}

          {step === 1.5 && creationMethod === 'fromSystemeio' && (
            <CourseSelector
              onSelect={handleCourseSelect}
              isLoading={isLoadingSystemio}
              courses={systemeIoCourses}
            />
          )}

          {step === 2 && (
            <CourseConfigurator
              courseData={courseData}
              onChange={setCourseData}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-deep-teal">Configure Lessons</h2>
              <LessonEditor
                courseData={courseData}
                onUpdate={handleSectionsUpdate}
                allowSectionModification={courseData.creationMethod === 'fromScratch'}
              />
              <div className="flex justify-end">
                <button
                  className="px-6 py-2.5 bg-teal-primary text-white rounded-xl font-medium hover:bg-teal-primary/90 disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </div>
          )}

          <NavigationButtons
            currentStep={step}
            steps={steps}
            onStepChange={setStep}
          />
        </div>
      </div>
    </>
  );
}
