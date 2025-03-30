'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ResumePDFDocument from '@/components/pdf/ResumePDFDocument';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase/config';
import { 
  doc, 
  getDoc, 
  updateDoc,
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { getIdToken } from 'firebase/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import debounce from 'lodash/debounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  fieldOfStudy?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface Resume {
  id: string;
  resumeName: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function EditResumePage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = typeof params.resumeId === 'string' ? params.resumeId : '';
  const [resumeData, setResumeData] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving' | 'Error'>('Saved');
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [isAddExpModalOpen, setIsAddExpModalOpen] = useState(false);
  const [isAddEduModalOpen, setIsAddEduModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExperienceEntry | null>(null);
  const [editingEduEntry, setEditingEduEntry] = useState<EducationEntry | null>(null);
  
  // New state variables for the experience form
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // State variables for education form
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newDegree, setNewDegree] = useState('');
  const [newFieldOfStudy, setNewFieldOfStudy] = useState('');
  const [newEduStartDate, setNewEduStartDate] = useState('');
  const [newEduEndDate, setNewEduEndDate] = useState('');
  const [newEduNotes, setNewEduNotes] = useState('');

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [summary, setSummary] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactPortfolio, setContactPortfolio] = useState('');
  const [contactLocation, setContactLocation] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhancingSummary, setIsEnhancingSummary] = useState(false);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [suggestSkillsError, setSuggestSkillsError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'classic'>('classic');

  // Create debounced update function
  const debouncedUpdateField = useMemo(
    () =>
      debounce(async (fieldName: string, value: any) => {
        if (!resumeId) return;

        setAutoSaveStatus('Saving');
        try {
          const docRef = doc(db, 'resumes', resumeId);
          await updateDoc(docRef, {
            [fieldName]: value,
            updatedAt: serverTimestamp()
          });
          setAutoSaveStatus('Saved');
        } catch (error) {
          console.error(`Error auto-saving ${fieldName}:`, error);
          setAutoSaveStatus('Error');
          toast.error(`Failed to auto-save ${fieldName}`);
        }
      }, 1500),
    [resumeId]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateField.cancel();
    };
  }, [debouncedUpdateField]);

  useEffect(() => {
    if (!resumeId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchResumeData = async () => {
      try {
        const docRef = doc(db, 'resumes', resumeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const fetchedData = docSnap.data();
          setResumeData({ id: docSnap.id, ...fetchedData } as Resume);
          setExperience(fetchedData.experience || []);
          setEducation(fetchedData.education || []);
          setSkills(fetchedData.skills || []);
          setSummary(fetchedData.summary || '');
          
          // Load contact information
          if (fetchedData.contact) {
            setContactEmail(fetchedData.contact.email || '');
            setContactPhone(fetchedData.contact.phone || '');
            setContactLinkedin(fetchedData.contact.linkedin || '');
            setContactPortfolio(fetchedData.contact.portfolio || '');
            setContactLocation(fetchedData.contact.location || '');
          } else {
            // Reset contact fields if contact object is missing
            setContactEmail('');
            setContactPhone('');
            setContactLinkedin('');
            setContactPortfolio('');
            setContactLocation('');
          }
        } else {
          console.log('No such document!');
          setResumeData(null);
          setExperience([]);
          setEducation([]);
          setSkills([]);
          setSummary('');
          // Reset contact fields if document doesn't exist
          setContactEmail('');
          setContactPhone('');
          setContactLinkedin('');
          setContactPortfolio('');
          setContactLocation('');
        }
      } catch (error) {
        console.error('Error fetching resume:', error);
        setResumeData(null);
        setExperience([]);
        setEducation([]);
        setSkills([]);
        setSummary('');
        // Reset contact fields on error
        setContactEmail('');
        setContactPhone('');
        setContactLinkedin('');
        setContactPortfolio('');
        setContactLocation('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumeData();
  }, [resumeId]);

  useEffect(() => {
    if (resumeData) {
      setEditedName(resumeData.resumeName);
    }
  }, [resumeData]);

  const handleSaveChanges = async () => {
    if (!resumeData || !resumeId) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'resumes', resumeId);
      
      // Construct contact data object
      const contactData = {
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
        linkedin: contactLinkedin.trim(),
        portfolio: contactPortfolio.trim(),
        location: contactLocation.trim(),
      };

      await updateDoc(docRef, {
        resumeName: editedName.trim(),
        experience: experience,
        education: education,
        skills: skills,
        summary: summary,
        contact: contactData, // Add contact object
        updatedAt: serverTimestamp()
      });
      toast.success('Resume changes saved.');
      setResumeData({
        ...resumeData,
        resumeName: editedName,
        experience: experience,
        education: education,
        skills: skills,
        summary: summary,
        contact: contactData // Update local resumeData with current contact
      });
    } catch (error) {
      console.error('Error updating resume:', error);
      toast.error('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveExperience = async () => {
    // Basic validation
    if (!newJobTitle.trim() || !newCompany.trim()) {
      toast.warning('Job title and company are required.');
      return;
    }

    let finalExperienceArray: ExperienceEntry[];
    
    if (editingEntry) {
      // Edit mode
      const updatedEntry = {
        jobTitle: newJobTitle.trim(),
        company: newCompany.trim(),
        startDate: newStartDate.trim(),
        endDate: newEndDate.trim(),
        description: newDescription.trim()
      };

      finalExperienceArray = experience.map(exp =>
        exp.id === editingEntry.id ? { ...updatedEntry, id: editingEntry.id } : exp
      );
    } else {
      // Add mode
      const newEntry: ExperienceEntry = {
        id: Date.now().toString(),
        jobTitle: newJobTitle.trim(),
        company: newCompany.trim(),
        startDate: newStartDate.trim(),
        endDate: newEndDate.trim(),
        description: newDescription.trim()
      };
      finalExperienceArray = [...experience, newEntry];
    }

    try {
      await updateDoc(doc(db, 'resumes', resumeId), {
        experience: finalExperienceArray,
        updatedAt: serverTimestamp()
      });
      toast.success('Experience saved.');
      setExperience(finalExperienceArray);
    } catch (error) {
      console.error('Failed to save experience directly:', error);
      toast.error('Failed to save experience.');
      return;
    }

    // Reset form fields and close modal
    setNewJobTitle('');
    setNewCompany('');
    setNewStartDate('');
    setNewEndDate('');
    setNewDescription('');
    setIsAddExpModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteExperience = async (entryIdToDelete: string) => {
    const updatedExperience = experience.filter(exp => exp.id !== entryIdToDelete);
    
    try {
      await updateDoc(doc(db, 'resumes', resumeId), {
        experience: updatedExperience,
        updatedAt: serverTimestamp()
      });
      toast.success('Experience entry deleted.');
      setExperience(updatedExperience);
    } catch (error) {
      console.error('Failed to delete experience:', error);
      toast.error('Failed to delete experience.');
    }
  };

  const handleSaveEducationEntry = async () => {
    // Basic validation
    if (!newSchoolName.trim() || !newDegree.trim()) {
      toast.warning('School name and degree are required.');
      return;
    }

    let finalEducationArray: EducationEntry[];
    
    if (editingEduEntry) {
      // Edit mode
      const updatedEduEntry = {
        schoolName: newSchoolName.trim(),
        degree: newDegree.trim(),
        fieldOfStudy: newFieldOfStudy.trim(),
        startDate: newEduStartDate.trim(),
        endDate: newEduEndDate.trim(),
        notes: newEduNotes.trim()
      };

      finalEducationArray = education.map(edu =>
        edu.id === editingEduEntry.id ? { ...updatedEduEntry, id: editingEduEntry.id } : edu
      );
    } else {
      // Add mode
      const newEduEntry: EducationEntry = {
        id: Date.now().toString(),
        schoolName: newSchoolName.trim(),
        degree: newDegree.trim(),
        fieldOfStudy: newFieldOfStudy.trim(),
        startDate: newEduStartDate.trim(),
        endDate: newEduEndDate.trim(),
        notes: newEduNotes.trim()
      };
      finalEducationArray = [...education, newEduEntry];
    }

    try {
      await updateDoc(doc(db, 'resumes', resumeId), {
        education: finalEducationArray,
        updatedAt: serverTimestamp()
      });
      toast.success(editingEduEntry ? 'Education entry updated.' : 'Education entry added.');
      setEducation(finalEducationArray);
      setEditingEduEntry(null);
    } catch (error) {
      console.error('Failed to save education entry:', error);
      toast.error('Failed to save education entry.');
      return;
    }

    // Reset form fields and close modal
    setNewSchoolName('');
    setNewDegree('');
    setNewFieldOfStudy('');
    setNewEduStartDate('');
    setNewEduEndDate('');
    setNewEduNotes('');
    setIsAddEduModalOpen(false);
  };

  const handleDeleteEducation = async (entryIdToDelete: string) => {
    const updatedEducation = education.filter(edu => edu.id !== entryIdToDelete);
    try {
      await updateDoc(doc(db, 'resumes', resumeId), {
        education: updatedEducation,
        updatedAt: serverTimestamp()
      });
      setEducation(updatedEducation); // Update local state only on success
      toast.success('Education entry deleted.');
    } catch (error) {
      console.error('Failed to delete education entry:', error);
      toast.error('Failed to delete education entry.');
    }
  };

  const handleAddSkill = async () => {
    const trimmedSkill = newSkill.trim();
    if (!trimmedSkill) {
      toast.warning('Skill cannot be empty.');
      return;
    }
    if (skills.includes(trimmedSkill)) {
      toast.warning('Skill already exists.');
      return;
    }
    const updatedSkills = [...skills, trimmedSkill];
    try {
      setSkills(updatedSkills); // Update local state immediately
      setNewSkill(''); // Clear input field
      debouncedUpdateField('skills', updatedSkills); // Use debounced update
      toast.success('Skill added.');
    } catch (error) {
      console.error("Failed to add skill:", error);
      toast.error('Failed to add skill.');
    }
  };

  const handleDeleteSkill = async (skillToDelete: string) => {
    const updatedSkills = skills.filter(skill => skill !== skillToDelete);
    try {
      setSkills(updatedSkills); // Update local state immediately
      debouncedUpdateField('skills', updatedSkills); // Use debounced update
      toast.success('Skill removed.');
    } catch (error) {
      console.error("Failed to delete skill:", error);
      toast.error('Failed to delete skill.');
    }
  };

  const handleSuggestSkills = async () => {
    console.log('Suggest Skills button clicked');
    // Prevent running if suggestions are already being fetched
    if (isSuggestingSkills) return;

    // Reset states
    setIsSuggestingSkills(true);
    setSuggestSkillsError(null);
    setSuggestedSkills([]);
    toast.info('Gathering context for skill suggestions...');

    // Get the function URL from environment variable
    const functionUrl = process.env.NEXT_PUBLIC_SUGGEST_SKILLS_FUNCTION_URL;
    
    // Validate URL
    if (!functionUrl) {
      console.error('Suggest skills function URL not configured');
      setSuggestSkillsError('Suggest skills function URL not configured');
      setIsSuggestingSkills(false);
      return;
    }

    // 1. Get context from existing state
    const currentSkills = skills;
    const currentSummary = summary;
    const jobTitles = experience.map(exp => exp.jobTitle).filter(title => !!title);
    const jobDescriptions = experience.map(exp => exp.description).filter(desc => !!desc);

    // Prepare context object
    const context = {
      summary: currentSummary,
      jobTitles,
      jobDescriptions,
      existingSkills: currentSkills
    };

    console.log('Context for suggestions:', context);
    console.log('Using function URL:', functionUrl);

    try {
      // Get auth token
      if (!auth.currentUser) {
        throw new Error('Authentication error. Please log in.');
      }
      const token = await getIdToken(auth.currentUser);

      // Make API call
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Function returned error:', errorText);
        throw new Error(`Request failed: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      console.log('Received suggestions:', data.suggestedSkills);
      
      if (data.suggestedSkills) {
        setSuggestedSkills(data.suggestedSkills);
        toast.success('Skill suggestions received!');
      } else {
        throw new Error('Invalid response structure from AI function.');
      }

    } catch (error: any) {
      console.error('Error suggesting skills:', error);
      setSuggestSkillsError(error.message || 'An unknown error occurred');
      toast.error(`Failed to get suggestions: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSuggestingSkills(false);
    }
  };

  const handleAddSuggestedSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      const updatedSkills = [...skills, skill];
      setSkills(updatedSkills); // Update local state immediately
      setSuggestedSkills(prev => prev.filter(s => s !== skill));
      debouncedUpdateField('skills', updatedSkills); // Use debounced update
      toast.success(`Added skill: ${skill}`);
    } else {
      toast.info('Skill already exists');
    }
  };

  const handleClearContactInfo = () => {
    setContactEmail('');
    setContactPhone('');
    setContactLinkedin('');
    setContactPortfolio('');
    setContactLocation('');
    toast.info('Contact fields cleared locally. Click Save to persist.');
  };

  const handleEnhanceDescription = async () => {
    const currentDescription = newDescription.trim();

    if (!currentDescription) {
      toast.info('Please enter a description first.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Authentication error. Please ensure you are logged in.');
      return;
    }

    setIsEnhancing(true);
    try {
      const token = await getIdToken(auth.currentUser);
      const functionUrl = 'https://enhance-resume-text-central1-test-sirxstvtva-uc.a.run.app';

      console.log('Calling enhance function at:', functionUrl);
      console.log('Sending description:', currentDescription);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ promptText: currentDescription }),
      });

      console.log('Function response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Function returned error:', errorText);
        throw new Error(`Request failed: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();

      if (data.enhancedText) {
        setNewDescription(data.enhancedText);
        toast.success('Description enhanced!');
      } else {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response structure from AI function.');
      }

    } catch (error: Error | unknown) {
      console.error('Error calling enhance function:', error);
      toast.error(`Failed to enhance description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleEnhanceSummary = async () => {
    const currentSummary = summary?.trim();
    if (!currentSummary) {
      toast.error('Please enter a summary to enhance');
      return;
    }

    if (!auth.currentUser) {
      toast.error('Please sign in to use AI enhancement');
      return;
    }

    setIsEnhancingSummary(true);
    try {
      const token = await getIdToken(auth.currentUser);
      const functionUrl = 'https://enhance-resume-text-central1-test-sirxstvtva-uc.a.run.app';

      console.log('Calling enhance function at:', functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          promptText: currentSummary
        }),
      });

      const data = await response.json();
      
      if (data.enhancedText) {
        setSummary(data.enhancedText);
        toast.success('Summary enhanced successfully!');
      } else {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response structure from AI function.');
      }

    } catch (error: Error | unknown) {
      console.error('Error calling enhance function:', error);
      toast.error(`Failed to enhance summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEnhancingSummary(false);
    }
  };

  // Update the summary onChange handler
  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setSummary(newValue);
    debouncedUpdateField('summary', newValue);
  };

  // Update contact field handlers
  const handleContactEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setContactEmail(newValue);
    debouncedUpdateField('contact.email', newValue);
  };

  const handleContactPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setContactPhone(newValue);
    debouncedUpdateField('contact.phone', newValue);
  };

  const handleContactLinkedinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setContactLinkedin(newValue);
    debouncedUpdateField('contact.linkedin', newValue);
  };

  const handleContactPortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setContactPortfolio(newValue);
    debouncedUpdateField('contact.portfolio', newValue);
  };

  const handleContactLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setContactLocation(newValue);
    debouncedUpdateField('contact.location', newValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!isLoading && !resumeData) {
    return (
      <div className="p-6 text-center text-red-600">
        <h1 className="text-2xl font-semibold mb-4">Resume Not Found</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/resume')}
          className="mt-4"
        >
          Back to Resumes
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => router.push('/dashboard/resume')}
        >
          Back to Resumes
        </Button>

        <h1 className="text-2xl font-semibold mb-4">
          Editing: {(resumeData as Resume).resumeName}
        </h1>
        <div className="space-y-4">
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            placeholder="Enter resume name"
            className="my-4"
          />
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {autoSaveStatus}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="template-select" className="text-sm">Template:</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={(value: 'classic') => {
                    console.log('Template selection changed:', {
                      previous: selectedTemplate,
                      new: value,
                      timestamp: new Date().toISOString()
                    });
                    setSelectedTemplate(value);
                  }}
                >
                  <SelectTrigger id="template-select" className="w-[180px]">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {resumeData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PDFDownloadLink
                        document={<ResumePDFDocument resume={resumeData} templateName={selectedTemplate} />}
                        fileName={`${resumeData.resumeName || 'resume'}.pdf`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                      >
                        {({ loading }) => loading ? 'Loading document...' : 'Download PDF'}
                      </PDFDownloadLink>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download your resume as PDF</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        <hr className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="space-y-2">
          <Label>Summary</Label>
          <Textarea
            value={summary || ''}
            onChange={handleSummaryChange}
            placeholder="Enter a brief summary of your professional background"
            className="h-32"
          />
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="mt-2"
            onClick={handleEnhanceSummary}
            disabled={isEnhancingSummary}
          >
            {isEnhancingSummary ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing...
              </>
            ) : (
              '✨ Enhance Summary with AI'
            )}
          </Button>
        </div>

        <hr className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <Label htmlFor="contactEmail">Email</Label>
            <Input 
              id="contactEmail" 
              type="email" 
              placeholder="your.email@example.com" 
              value={contactEmail} 
              onChange={handleContactEmailChange}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input 
              id="contactPhone" 
              placeholder="(123) 456-7890" 
              value={contactPhone} 
              onChange={handleContactPhoneChange}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contactLinkedin">LinkedIn URL</Label>
            <Input 
              id="contactLinkedin" 
              placeholder="linkedin.com/in/yourprofile" 
              value={contactLinkedin} 
              onChange={handleContactLinkedinChange}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contactPortfolio">Portfolio URL</Label>
            <Input 
              id="contactPortfolio" 
              placeholder="yourportfolio.com" 
              value={contactPortfolio} 
              onChange={handleContactPortfolioChange}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contactLocation">Location</Label>
            <Input 
              id="contactLocation" 
              placeholder="City, State or Remote" 
              value={contactLocation} 
              onChange={handleContactLocationChange}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="mt-4"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Contact Info'
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearContactInfo}
            className="mt-4 ml-2"
          >
            Clear Contact Info
          </Button>
        </div>

        <hr className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4">Work Experience</h2>
        
        {experience.length === 0 ? (
          <p className="text-gray-500">No experience added yet.</p>
        ) : (
          <div className="space-y-4 mb-4">
            {experience.map((entry) => (
              <div 
                key={entry.id}
                className="p-4 border rounded-lg flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium">{entry.jobTitle}</h3>
                  <p className="text-gray-600">{entry.company}</p>
                  <p className="text-sm text-gray-500">
                    {entry.startDate} - {entry.endDate}
                  </p>
                </div>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingEntry(entry);
                      setNewJobTitle(entry.jobTitle);
                      setNewCompany(entry.company);
                      setNewStartDate(entry.startDate);
                      setNewEndDate(entry.endDate);
                      setNewDescription(entry.description);
                      setIsAddExpModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this
                          experience entry.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteExperience(entry.id)}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog 
          open={isAddExpModalOpen} 
          onOpenChange={(open) => {
            setIsAddExpModalOpen(open);
            if (!open) {
              setEditingEntry(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="mt-4"
            >
              Add Experience
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Experience' : 'Add New Experience'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input 
                  id="jobTitle" 
                  placeholder="Software Engineer"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  placeholder="Tech Corp"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate" 
                    placeholder="YYYY-MM"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input 
                    id="endDate" 
                    placeholder="YYYY-MM or Present"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe your role and accomplishments..."
                  className="h-32"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="mt-2"
                  onClick={handleEnhanceDescription}
                  disabled={isEnhancing}
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing...
                    </>
                  ) : (
                    '✨ Enhance with AI'
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingEntry(null);
                  setIsAddExpModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveExperience}>
                {editingEntry ? 'Update Experience' : 'Save Experience'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <hr className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4">Education</h2>
        
        {education.length === 0 ? (
          <p className="text-gray-500">No education added yet.</p>
        ) : (
          <ul className="space-y-4 mb-4">
            {education.map((entry) => (
              <li key={entry.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <h3 className="font-medium">{entry.schoolName}</h3>
                  <p className="text-gray-600">{entry.degree}</p>
                  {entry.fieldOfStudy && (
                    <p className="text-gray-600">{entry.fieldOfStudy}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {entry.startDate} - {entry.endDate}
                  </p>
                </div>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingEduEntry(entry);
                      setNewSchoolName(entry.schoolName);
                      setNewDegree(entry.degree);
                      setNewFieldOfStudy(entry.fieldOfStudy || '');
                      setNewEduStartDate(entry.startDate);
                      setNewEduEndDate(entry.endDate);
                      setNewEduNotes(entry.notes || '');
                      setIsAddEduModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this
                          education entry.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteEducation(entry.id)}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Dialog 
          open={isAddEduModalOpen} 
          onOpenChange={(open) => {
            setIsAddEduModalOpen(open);
            if (!open) {
              setEditingEduEntry(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="mt-4"
            >
              Add Education
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingEduEntry ? 'Edit Education' : 'Add Education'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input 
                  id="schoolName" 
                  placeholder="University of Example"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="degree">Degree</Label>
                <Input 
                  id="degree" 
                  placeholder="Bachelor of Science"
                  value={newDegree}
                  onChange={(e) => setNewDegree(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fieldOfStudy">Field of Study (Optional)</Label>
                <Input 
                  id="fieldOfStudy" 
                  placeholder="Computer Science"
                  value={newFieldOfStudy}
                  onChange={(e) => setNewFieldOfStudy(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="eduStartDate">Start Date</Label>
                  <Input 
                    id="eduStartDate" 
                    placeholder="YYYY-MM"
                    value={newEduStartDate}
                    onChange={(e) => setNewEduStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eduEndDate">End Date</Label>
                  <Input 
                    id="eduEndDate" 
                    placeholder="YYYY-MM or Present"
                    value={newEduEndDate}
                    onChange={(e) => setNewEduEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eduNotes">Notes (Optional)</Label>
                <Textarea 
                  id="eduNotes" 
                  placeholder="Additional details about your education..."
                  className="h-32"
                  value={newEduNotes}
                  onChange={(e) => setNewEduNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingEduEntry(null);
                  setIsAddEduModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEducationEntry}>
                {editingEduEntry ? 'Update Education' : 'Save Education'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <hr className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4">Skills</h2>
        
        {skills.length === 0 ? (
          <p className="text-gray-500 mb-4">No skills added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((skill, index) => (
              <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700">
                <span>{skill}</span>
                <button
                  onClick={() => handleDeleteSkill(skill)}
                  className="ml-2 text-red-500 hover:text-red-700 font-bold text-xs"
                  aria-label={`Remove ${skill}`}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-center">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a new skill"
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddSkill();
              }
            }}
          />
          <Button onClick={handleAddSkill}>Add Skill</Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="ml-2"
            onClick={handleSuggestSkills}
            disabled={isSuggestingSkills || isLoading}
          >
            {isSuggestingSkills ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Suggesting...
              </>
            ) : (
              '✨ Suggest Skills'
            )}
          </Button>
        </div>

        {/* Suggestions Section */}
        {isSuggestingSkills && (
          <p className="mt-4 text-gray-600">Loading suggestions...</p>
        )}

        {suggestSkillsError && (
          <p className="mt-4 text-red-500">Error: {suggestSkillsError}</p>
        )}

        {suggestedSkills.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Suggested Skills (Click to add):</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedSkills.map((skill) => (
                <Button
                  key={skill}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSuggestedSkill(skill)}
                >
                  {skill} +
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 