import React from 'react';
import { CourseCreationFlow } from './CourseCreationFlow';

export const CoursesPage: React.FC = () => {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-deep-teal">My Courses</h1>
        <p className="text-slate-500 font-medium mt-1">
          Create and manage breathwork courses for The School of Breath app.
        </p>
      </header>
      <CourseCreationFlow />
    </div>
  );
};
