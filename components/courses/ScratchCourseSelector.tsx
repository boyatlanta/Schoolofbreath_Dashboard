import {
  BookOpen,
  ChevronRight,
  Clock,
  FolderOpen,
  ImageIcon,
  Loader,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Course } from '../../models/courses.models';
import { toast } from 'react-toastify';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteScratchCourse, updateCourseOrder } from '../../services/coursesService';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';

interface ScratchCourseSelectorProps {
  onSelect: (course: Course) => void;
  onCreateNew: () => void;
  isLoading: boolean;
  courses: Course[];
}

export function ScratchCourseSelector({
  onSelect,
  onCreateNew,
  isLoading,
  courses,
}: ScratchCourseSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [orderedCourses, setOrderedCourses] = useState<Course[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    setOrderedCourses(courses);
  }, [courses]);

  const filteredCourses = orderedCourses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: deleteScratchCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scratch-courses'] });
      toast.success('Course deleted successfully!', { position: 'top-right', autoClose: 3000 });
    },
    onError: () => {
      toast.error('Failed to delete course', { position: 'top-right', autoClose: 3000 });
    },
  });

  const orderMutation = useMutation({
    mutationFn: updateCourseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scratch-courses'] });
      toast.success('Course order updated!', { position: 'top-right', autoClose: 3000 });
    },
    onError: () => {
      toast.error('Failed to update order');
      setOrderedCourses(courses);
    },
  });

  const handleDeleteCourse = (courseId: string) => {
    toast.warn(
      <div>
        <p className="font-medium">Delete Course?</p>
        <p className="text-sm mt-1">This action cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => toast.dismiss()}
            className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss();
              deleteMutation.mutate(courseId);
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(orderedCourses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrderedCourses(items);
    const updates = items.map((course, index) => ({
      id: course._id as string,
      order: index,
    }));
    orderMutation.mutate(updates);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-deep-teal">Your Courses</h2>
          <p className="mt-1 text-sm text-slate-500">Manage and edit your created courses or start a new one</p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center px-4 py-2 bg-teal-primary hover:bg-teal-primary/90 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New Course
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search courses by title..."
          className="block w-full pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-500 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-transparent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-teal-primary" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="courses" type="COURSE">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filteredCourses.length === 0 ? (
                  <div className="col-span-full py-12">
                    <div className="text-center">
                      <FolderOpen className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-sm font-medium text-slate-700">No courses found</h3>
                      <p className="mt-1 text-sm text-slate-500">Get started by creating a new course</p>
                      <button
                        onClick={onCreateNew}
                        className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-primary hover:bg-teal-primary/90 rounded-xl"
                      >
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Create New Course
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredCourses.map((course, index) => (
                    <Draggable key={course._id || course.id} draggableId={course._id || course.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-move text-slate-500"
                          >
                            ⋮
                          </div>
                          <div className="aspect-w-16 aspect-h-9 bg-slate-200">
                            {course.image ? (
                              <img
                                src={course.image}
                                alt={course.title}
                                className="object-cover h-[200px] w-full"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-[200px]">
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-medium text-deep-teal truncate">{course.title}</h3>
                            <div className="mt-1 flex items-center text-sm text-slate-500">
                              <BookOpen className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              {course.sections.length} sections
                            </div>
                            <div className="mt-1 flex items-center text-sm text-slate-500">
                              <Clock className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              {course.time}
                            </div>
                            <div className="mt-4 flex justify-end space-x-2">
                              <button
                                onClick={() => onSelect(course)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-primary hover:text-teal-primary/80"
                              >
                                Edit Course
                                <ChevronRight className="ml-1 w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCourse(course._id ?? course.id)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-rose-600 hover:text-rose-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
