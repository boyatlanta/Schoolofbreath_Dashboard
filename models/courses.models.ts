export interface Lesson {
  id: string;
  title: string;
  videoUrl?: string;
  audioUrl?: string;
  type?: 'video' | 'file' | 'audio';
  isFromYoutube?: boolean;
  file?: string;
  isPremium?: boolean;
}

export interface Author {
  name: string;
  bio: string;
  profileImage: string;
}

export interface Section {
  section: string;
  lessons: Lesson[];
  isPremium?: boolean;
}

export interface Course {
  _id?: string;
  id: string;
  systemeIoId?: string;
  creationMethod: 'fromScratch' | 'fromSystemeio';
  title: string;
  description: string;
  image: string;
  type: string;
  days: string;
  time: string;
  courseTheme: string;
  reviews: any[];
  author: Author;
  sections: Section[];
  accessTags?: string[];
  createdAt?: string | number;
}
