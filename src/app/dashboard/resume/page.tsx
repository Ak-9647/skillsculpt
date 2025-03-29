'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  deleteDoc,
  doc,
  serverTimestamp, 
  query, 
  where, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';

interface Resume {
  id: string;
  userId: string;
  resumeName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function ResumePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setResumes([]);
      setIsLoadingResumes(false);
      return;
    }

    setIsLoadingResumes(true);
    
    const q = query(
      collection(db, 'resumes'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const resumesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Resume[];
        setResumes(resumesData);
        setIsLoadingResumes(false);
      },
      (error) => {
        console.error('Error fetching resumes:', error);
        setIsLoadingResumes(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCreateResume = async () => {
    if (!user) {
      console.error('No user logged in');
      alert('Please log in to create a resume');
      return;
    }

    setIsCreating(true);

    const newResumeData = {
      userId: user.uid,
      resumeName: 'Untitled Resume',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'resumes'), newResumeData);
      console.log('Resume created successfully with ID:', docRef.id);
    } catch (error) {
      console.error('Error creating resume:', error);
      alert('Error creating resume. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'resumes', resumeId));
      console.log('Resume deleted successfully:', resumeId);
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Error deleting resume.');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <h1 className="text-2xl font-semibold mb-4">Resume Builder</h1>
        <p className="text-gray-600 mb-6">Manage your resumes here.</p>
        <Button 
          onClick={handleCreateResume} 
          disabled={isCreating}
          className="w-full sm:w-auto"
        >
          {isCreating ? 'Creating...' : 'Create New Resume'}
        </Button>

        <div className="mt-8">
          {isLoadingResumes ? (
            <p className="text-gray-600">Loading resumes...</p>
          ) : resumes.length === 0 ? (
            <p className="text-gray-600">No resumes found. Create one!</p>
          ) : (
            <ul className="space-y-3">
              {resumes.map(resume => (
                <li 
                  key={resume.id} 
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Link 
                    href={`/dashboard/resume/${resume.id}/edit`}
                    className="hover:underline text-blue-600"
                  >
                    <span>{resume.resumeName}</span>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteResume(resume.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 