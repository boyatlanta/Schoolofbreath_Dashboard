export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  headerColor: string;
  courseTitleColor: string;
  instructorTextColor: string;
  tabBackgroundColor: string;
  dayBackgroundColor: string;
  sectionBackgroundColor: string;
  subsectionBackgroundColor: string;
  lessonBackgroundColor: string;
  reviewBackgroundColor: string;
  descriptionColor: string;
}

export interface Theme {
  _id: string;
  name: string;
  colors: ThemeColors;
  isDefault: boolean;
  createdAt?: string;
}
