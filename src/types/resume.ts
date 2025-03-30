import { Timestamp, FieldValue } from 'firebase/firestore';

export interface ExperienceEntry {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationEntry {
  id: string;
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface Contact {
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  location: string;
}

export interface Resume {
  id: string;
  userId: string;
  resumeName: string;
  contact: Contact;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  templatePreference?: 'classic' | 'modern' | 'minimal' | 'professional';
  createdAt?: Timestamp;
  updatedAt?: Timestamp | FieldValue;
}

export type ResumeUpdate = {
  resumeName?: string;
  contact?: Contact;
  summary?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: string[];
  templatePreference?: 'classic' | 'modern' | 'minimal' | 'professional';
  updatedAt?: FieldValue;
};

export type ContactUpdate = {
  email?: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  location?: string;
}; 