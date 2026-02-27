import { Course } from '../models/courses.models';
import { getCoursesApiUrl } from '../utils/coursesApi.config';

export type CreationMethod = 'fromScratch' | 'fromSystemeio';

export const fetchExistingCourse = async (systemeIoId: string) => {
  try {
    const response = await fetch(`${getCoursesApiUrl()}/courses/course/${systemeIoId}`);
    if (response.ok) return response.json();
    return null;
  } catch (error) {
    console.error('Error fetching course:', error);
    return null;
  }
};

export const fetchScratchCourses = async () => {
  const response = await fetch(`${getCoursesApiUrl()}/courses/scratch`);
  if (!response.ok) throw new Error('Failed to fetch scratch courses');
  return response.json();
};

export const createCourse = async (data: { courseData: Course; creationMethod: CreationMethod }) => {
  const response = await fetch(`${getCoursesApiUrl()}/courses/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create course');
  return response.json();
};

export const updateCourse = async (data: { courseData: Course; creationMethod: CreationMethod }) => {
  const response = await fetch(`${getCoursesApiUrl()}/courses/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update course');
  return response.json();
};

export const deleteScratchCourse = async (courseId: string) => {
  const response = await fetch(`${getCoursesApiUrl()}/courses/scratch/${courseId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete course');
  return response.json();
};

export const updateCourseOrder = async (updates: { id: string; order: number }[]) => {
  const response = await fetch(`${getCoursesApiUrl()}/courses/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!response.ok) throw new Error('Failed to update course order');
  return response.json();
};
