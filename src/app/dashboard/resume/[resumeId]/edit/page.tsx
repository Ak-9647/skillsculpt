'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ResumePDFDocument from '@/components/pdf/ResumePDFDocument'; // Assuming path is correct
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { db } from '@/lib/firebase/config'; // Assuming path is correct
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase/config'; // Assuming path is correct
import { getIdToken } from 'firebase/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Assuming path is correct
import debounce from 'lodash/debounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Assuming path is correct

// Ensure your types path is correct
// You might need to adjust this import path
import { Resume, ExperienceEntry, EducationEntry, Contact, ResumeUpdate } from '@/types/resume'; 

// Interfaces should ideally be defined in or imported from types/resume.ts
// export interface ExperienceEntry { id: string; jobTitle: string; ... }
// export interface EducationEntry { id: string; schoolName: string; ... }
// export interface Resume { id: string; resumeName: string; ... }


export default function EditResumePage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = typeof params.resumeId === 'string' ? params.resumeId : '';

  // Resume Data State
  const [resumeData, setResumeData] = useState<Resume | null>(null);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [editedName, setEditedName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactPortfolio, setContactPortfolio] = useState('');
  const [contactLocation, setContactLocation] = useState('');

  // Loading / Saving States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // For main save button
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving' | 'Error'>('Saved'); // For auto-save feedback

  // Modal States
  const [isAddExpModalOpen, setIsAddExpModalOpen] = useState(false);
  const [isAddEduModalOpen, setIsAddEduModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExperienceEntry | null>(null);
  const [editingEduEntry, setEditingEduEntry] = useState<EducationEntry | null>(null);

  // Experience Form State
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Education Form State
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newDegree, setNewDegree] = useState('');
  const [newFieldOfStudy, setNewFieldOfStudy] = useState('');
  const [newEduStartDate, setNewEduStartDate] = useState('');
  const [newEduEndDate, setNewEduEndDate] = useState('');
  const [newEduNotes, setNewEduNotes] = useState('');

  // Skills State
  const [newSkill, setNewSkill] = useState('');

  // AI Feature States
  const [isEnhancing, setIsEnhancing] = useState(false); // For experience description
  const [isEnhancingSummary, setIsEnhancingSummary] = useState(false);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [suggestSkillsError, setSuggestSkillsError] = useState<string | null>(null);

  // PDF Template State
  const [selectedTemplate, setSelectedTemplate] = useState<'classic'>('classic'); // Simplified for now


  // --- Debounced Auto-Save ---
  const debouncedUpdateField = useMemo(
    () =>
      debounce(async (fieldName: string, value: unknown) => { // Use unknown for value type safety
        if (!resumeId) return;
        // Basic check for serializable types (string, array, simple object)
        if (typeof value !== 'string' && !Array.isArray(value) && typeof value !== 'object') {
            console.warn(`Auto-save skipped for field ${fieldName}: Non-serializable value type ${typeof value}`);
            return;
        }

        console.log(`Auto-saving field: ${fieldName}`);
        setAutoSaveStatus('Saving');
        try {
          const docRef = doc(db, 'resumes', resumeId);
          // Ensure value is trimmed if it's a string before saving
          const valueToSave = typeof value === 'string' ? value.trim() : value;
          await updateDoc(docRef, {
            [fieldName]: valueToSave,
            updatedAt: serverTimestamp()
          });
          setAutoSaveStatus('Saved');
        } catch (error: unknown) { // *** FIXED: Use unknown ***
          console.error(`Error auto-saving ${fieldName}:`, error);
          setAutoSaveStatus('Error');
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast.error(`Failed to auto-save ${fieldName}: ${message}`);
        }
      }, 1500), // 1.5 second delay
    [resumeId] // Dependency array includes resumeId
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateField.cancel();
    };
  }, [debouncedUpdateField]);


  // --- Fetch Initial Data ---
  useEffect(() => {
    if (!resumeId) {
      setIsLoading(false);
      toast.error("Invalid Resume ID.");
      router.push('/dashboard/resume');
      return;
    }

    const fetchResumeData = async () => {
      try {
        const docRef = doc(db, 'resumes', resumeId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const defaultContact: Contact = {
            email: '',
            phone: '',
            linkedin: '',
            portfolio: '',
            location: ''
          };
          
          const resume: Resume = {
            id: docSnap.id,
            userId: data.userId || auth.currentUser?.uid || '',
            resumeName: data.resumeName || '',
            contact: { ...defaultContact, ...data.contact },
            summary: data.summary || '',
            experience: data.experience || [],
            education: data.education || [],
            skills: data.skills || [],
            templatePreference: data.templatePreference || 'classic',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
          
          setResumeData(resume);
          setExperience(resume.experience);
          setEducation(resume.education);
          setSkills(resume.skills);
          setSummary(resume.summary);
          setEditedName(resume.resumeName);
          setContactEmail(resume.contact.email);
          setContactPhone(resume.contact.phone);
          setContactLinkedin(resume.contact.linkedin);
          setContactPortfolio(resume.contact.portfolio);
          setContactLocation(resume.contact.location);
        } else {
          console.log('No such document!');
          toast.error("Resume not found.");
          setResumeData(null);
          router.push('/dashboard/resume');
        }
      } catch (error: unknown) {
        console.error('Error fetching resume:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        toast.error(`Failed to load resume: ${message}`);
        setIsLoading(false);
        router.push('/dashboard/resume');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumeData();
  }, [resumeId, router, auth.currentUser]);


  // Update editedName from resumeData if resumeData loads/changes
  useEffect(() => {
    if (resumeData && !editedName) { // Only set initially or if cleared
      setEditedName(resumeData.resumeName);
    }
  }, [resumeData, editedName]);


  // --- Save Handlers ---

  // Main save button handler (primarily for arrays now, but saves all for consistency)
  const handleSaveChanges = async () => {
    if (!resumeData) return;

    try {
      setAutoSaveStatus('Saving');
      const resumeRef = doc(db, 'resumes', resumeId as string);
      
      const contact: Contact = {
        email: contactEmail,
        phone: contactPhone,
        linkedin: contactLinkedin,
        portfolio: contactPortfolio,
        location: contactLocation,
      };

      const update: ResumeUpdate = {
        resumeName: editedName,
        contact,
        summary,
        experience,
        education,
        skills,
        updatedAt: serverTimestamp()
      };

      await updateDoc(resumeRef, update);
      setAutoSaveStatus('Saved');
      toast.success('Changes saved successfully');

      // Update local state while preserving all required fields
      setResumeData(prevData => {
        if (!prevData) return null;
        const updatedResume: Resume = {
          id: prevData.id,
          userId: prevData.userId || auth.currentUser?.uid || '',
          resumeName: editedName,
          contact,
          summary,
          experience,
          education,
          skills,
          templatePreference: prevData.templatePreference || 'classic',
          createdAt: prevData.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        return updatedResume;
      });
    } catch (error: unknown) {
      console.error('Error saving changes:', error);
      setAutoSaveStatus('Error');
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to save changes: ${message}`);
    }
  };


  // Experience save handler (saves directly from modal)
  const handleSaveExperience = async () => {
    if (!newJobTitle.trim() || !newCompany.trim()) { toast.warning('Job title and company are required.'); return; }
    let finalExperienceArray: ExperienceEntry[];
    if (editingEntry) {
      finalExperienceArray = experience.map(exp => exp.id === editingEntry.id ? { ...editingEntry, jobTitle: newJobTitle.trim(), company: newCompany.trim(), startDate: newStartDate.trim(), endDate: newEndDate.trim(), description: newDescription.trim() } : exp );
    } else {
      const newEntry: ExperienceEntry = { id: Date.now().toString(), jobTitle: newJobTitle.trim(), company: newCompany.trim(), startDate: newStartDate.trim(), endDate: newEndDate.trim(), description: newDescription.trim() };
      finalExperienceArray = [...experience, newEntry];
    }
    try {
      setIsSaving(true); // Use main saving indicator
      await updateDoc(doc(db, 'resumes', resumeId), { experience: finalExperienceArray, updatedAt: serverTimestamp() });
      toast.success('Experience saved.');
      setExperience(finalExperienceArray);
      setIsAddExpModalOpen(false); setEditingEntry(null);
      setNewJobTitle(''); setNewCompany(''); setNewStartDate(''); setNewEndDate(''); setNewDescription('');
    } catch (error: unknown) { // *** FIXED: Use unknown ***
      console.error('Failed to save experience:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save experience: ${message}`);
    } finally {
       setIsSaving(false);
    }
  };

  // Delete Experience
  const handleDeleteExperience = async (entryIdToDelete: string) => {
    const updatedExperience = experience.filter(exp => exp.id !== entryIdToDelete);
    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'resumes', resumeId), { experience: updatedExperience, updatedAt: serverTimestamp() });
      toast.success('Experience entry deleted.');
      setExperience(updatedExperience);
    } catch (error: unknown) { // *** FIXED: Use unknown ***
      console.error('Failed to delete experience:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete experience: ${message}`);
    } finally {
       setIsSaving(false);
    }
  };


  // Education save handler (saves directly from modal)
  const handleSaveEducationEntry = async () => {
    if (!newSchoolName.trim() || !newDegree.trim()) { toast.warning('School name and degree are required.'); return; }
    let finalEducationArray: EducationEntry[];
    if (editingEduEntry) {
      finalEducationArray = education.map(edu => edu.id === editingEduEntry.id ? { ...editingEduEntry, schoolName: newSchoolName.trim(), degree: newDegree.trim(), fieldOfStudy: newFieldOfStudy.trim(), startDate: newEduStartDate.trim(), endDate: newEduEndDate.trim(), notes: newEduNotes.trim() } : edu );
    } else {
      const newEduEntry: EducationEntry = { id: Date.now().toString(), schoolName: newSchoolName.trim(), degree: newDegree.trim(), fieldOfStudy: newFieldOfStudy.trim(), startDate: newEduStartDate.trim(), endDate: newEduEndDate.trim(), notes: newEduNotes.trim() };
      finalEducationArray = [...education, newEduEntry];
    }
    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'resumes', resumeId), { education: finalEducationArray, updatedAt: serverTimestamp() });
      toast.success(editingEduEntry ? 'Education entry updated.' : 'Education entry added.');
      setEducation(finalEducationArray);
      setIsAddEduModalOpen(false); setEditingEduEntry(null);
      setNewSchoolName(''); setNewDegree(''); setNewFieldOfStudy(''); setNewEduStartDate(''); setNewEduEndDate(''); setNewEduNotes('');
    } catch (error: unknown) { // *** FIXED: Use unknown ***
      console.error('Failed to save education entry:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save education entry: ${message}`);
    } finally {
        setIsSaving(false);
    }
  };

  // Delete Education
  const handleDeleteEducation = async (entryIdToDelete: string) => {
    const updatedEducation = education.filter(edu => edu.id !== entryIdToDelete);
    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'resumes', resumeId), { education: updatedEducation, updatedAt: serverTimestamp() });
      setEducation(updatedEducation);
      toast.success('Education entry deleted.');
    } catch (error: unknown) { // *** FIXED: Use unknown ***
      console.error('Failed to delete education entry:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete education entry: ${message}`);
    } finally {
       setIsSaving(false);
    }
  };


  // Skills handlers (use auto-save via debounce)
  const handleAddSkill = () => { // Made non-async as update is debounced
    const trimmedSkill = newSkill.trim();
    if (!trimmedSkill) { toast.warning('Skill cannot be empty.'); return; }
    if (skills.includes(trimmedSkill)) { toast.warning('Skill already exists.'); return; }
    const updatedSkills = [...skills, trimmedSkill];
    setSkills(updatedSkills); // Update local state immediately
    setNewSkill(''); // Clear input field
    debouncedUpdateField('skills', updatedSkills); // Trigger auto-save
    toast.success('Skill added.'); // Optimistic UI update
  };

  const handleDeleteSkill = (skillToDelete: string) => { // Made non-async
    const updatedSkills = skills.filter(skill => skill !== skillToDelete);
    setSkills(updatedSkills); // Update local state immediately
    debouncedUpdateField('skills', updatedSkills); // Trigger auto-save
    toast.success('Skill removed.'); // Optimistic UI update
  };

  const handleAddSuggestedSkill = (skill: string) => { // Made non-async
    if (!skills.includes(skill)) {
      const updatedSkills = [...skills, skill];
      setSkills(updatedSkills);
      setSuggestedSkills(prev => prev.filter(s => s !== skill));
      debouncedUpdateField('skills', updatedSkills); // Trigger auto-save
      toast.success(`Added skill: ${skill}`);
    } else {
      toast.info('Skill already exists');
    }
  };


  // --- AI Feature Handlers ---

  const handleSuggestSkills = async () => {
    console.log('Suggest Skills button clicked');
    if (isSuggestingSkills) return;
    setIsSuggestingSkills(true); setSuggestSkillsError(null); setSuggestedSkills([]);
    toast.info('Gathering context for skill suggestions...');
    const functionUrl = process.env.NEXT_PUBLIC_SUGGEST_SKILLS_FUNCTION_URL;
    if (!functionUrl) {
      const errorMsg = 'Suggest skills function URL not configured';
      console.error(errorMsg); setSuggestSkillsError(errorMsg); setIsSuggestingSkills(false); return;
    }
    const context = { summary: summary || '', jobTitles: experience.map(exp => exp.jobTitle || ''), jobDescriptions: experience.map(exp => exp.description || ''), existingSkills: skills || [] };
    console.log('Context for suggestions:', context);
    const bodyString = JSON.stringify(context);
    console.log('Stringified body being sent:', bodyString);
    try {
      JSON.parse(bodyString); console.log('Body context appears to be valid JSON.');
    } catch (stringifyError: unknown) { // *** FIXED: Use unknown ***
        const message = stringifyError instanceof Error ? stringifyError.message : 'Unknown parse error';
        const errorMsg = `Internal error: Invalid context data cannot be sent. (${message})`;
        console.error('ERROR: Body context is NOT valid JSON!', stringifyError);
        setSuggestSkillsError(errorMsg); setIsSuggestingSkills(false); return;
    }
    console.log(`Calling suggest skills function at: ${functionUrl}`); // *** FIXED: Use functionUrl ***
    try {
      if (!auth.currentUser) { throw new Error('Authentication error. Please log in.'); }
      const token = await getIdToken(auth.currentUser);
      const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: bodyString });
      if (!response.ok) {
        let errorText = `HTTP error! Status: ${response.status}`;
        try {
          const backendError = await response.text();
          errorText += ` - ${backendError}`;
        } catch (_textError) { /* ignore */ }
        console.error(`Error from suggest skills function: ${errorText}`); throw new Error(errorText);
      }
      const data = await response.json();
      console.log('Received suggestions:', data.suggestedSkills);
      if (data.suggestedSkills && Array.isArray(data.suggestedSkills)) { // Add type check
        setSuggestedSkills(data.suggestedSkills); toast.success('Skill suggestions received!');
      } else { throw new Error('Invalid response structure from AI function.'); }
    } catch (error: unknown) { // *** FIXED: Use unknown ***
      console.error('Error suggesting skills:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setSuggestSkillsError(message); toast.error(`Failed to get suggestions: ${message}`);
    } finally {
      setIsSuggestingSkills(false);
    }
  };


  const handleEnhanceDescription = async () => {
    const currentDescription = newDescription.trim();
    if (!currentDescription) { toast.info('Please enter a description first.'); return; }
    if (!auth.currentUser) { toast.error('Authentication error.'); return; }
    setIsEnhancing(true);
    try {
      const token = await getIdToken(auth.currentUser);
      const functionUrl = process.env.NEXT_PUBLIC_ENHANCE_FUNCTION_URL;
      if (!functionUrl) throw new Error("Enhance function URL not configured");

      console.log('Calling enhance function at:', functionUrl); console.log('Sending description:', currentDescription);
      const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ promptText: currentDescription }) });
      console.log('Function response status:', response.status);
      if (!response.ok) { const errorText = await response.text(); throw new Error(`Request failed: ${response.status} ${errorText}`); }
      const data = await response.json();
      if (data.enhancedText) { setNewDescription(data.enhancedText); toast.success('Description enhanced!'); }
      else { console.error('Invalid response structure:', data); throw new Error('Invalid response structure from AI function.'); }
    } catch (error: unknown) { // *** FIXED: Use unknown ***
      console.error('Error calling enhance function:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to enhance description: ${message}`);
    } finally {
      setIsEnhancing(false);
    }
  };


  const handleEnhanceSummary = async () => {
    const currentSummary = summary?.trim();
    if (!currentSummary) { toast.error('Please enter a summary to enhance'); return; }
    if (!auth.currentUser) { toast.error('Please sign in first'); return; }
    setIsEnhancingSummary(true);
    try {
      const token = await getIdToken(auth.currentUser);
      const functionUrl = process.env.NEXT_PUBLIC_ENHANCE_FUNCTION_URL;
      if (!functionUrl) throw new Error("Enhance function URL not configured");

      console.log('Calling enhance function at:', functionUrl);
      const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ promptText: currentSummary }) });
      if (!response.ok) { const errorText = await response.text(); throw new Error(`Request failed: ${response.status} ${errorText}`); }
      const data = await response.json();
      if (data.enhancedText) {
        setSummary(data.enhancedText); // Update local state
        debouncedUpdateField('summary', data.enhancedText); // Trigger auto-save
        toast.success('Summary enhanced successfully!');
      } else { console.error('Invalid response structure:', data); throw new Error('Invalid response structure from AI function.'); }
    } catch (error: unknown) { // *** FIXED: Use unknown ***
      console.error('Error calling enhance function:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to enhance summary: ${message}`);
    } finally {
      setIsEnhancingSummary(false);
    }
  };


  // --- Input Change Handlers with Debounce ---
  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setSummary(newValue);
    debouncedUpdateField('summary', newValue);
  };
  const handleContactEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; setContactEmail(newValue); debouncedUpdateField('contact.email', newValue);
  };
  const handleContactPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; setContactPhone(newValue); debouncedUpdateField('contact.phone', newValue);
  };
  const handleContactLinkedinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; setContactLinkedin(newValue); debouncedUpdateField('contact.linkedin', newValue);
  };
  const handleContactPortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; setContactPortfolio(newValue); debouncedUpdateField('contact.portfolio', newValue);
  };
  const handleContactLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; setContactLocation(newValue); debouncedUpdateField('contact.location', newValue);
  };
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; setEditedName(newValue); debouncedUpdateField('resumeName', newValue);
  };


  // --- Render Logic ---
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  if (!resumeData) return <div className="p-6 text-center text-red-500">Resume not found or access error. <Button variant="link" onClick={() => router.push('/dashboard/resume')}>Go Back</Button></div>;

  // Ensure resumeData is not null before passing to PDF component
  const currentResumeDataForPdf: Resume = {
    id: resumeId,
    userId: resumeData.userId, // Add missing required userId field
    resumeName: editedName,
    contact: { email: contactEmail, phone: contactPhone, location: contactLocation, linkedin: contactLinkedin, portfolio: contactPortfolio },
    summary: summary,
    experience: experience,
    education: education,
    skills: skills,
    createdAt: resumeData?.createdAt || Timestamp.now(), // Use existing or now()
    updatedAt: Timestamp.now() // Use now() for generation time
  };


  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6 sm:p-8">
        {/* Back Button */}
        <Button variant="outline" size="sm" className="mb-4" onClick={() => router.push('/dashboard/resume')}>
          &larr; Back to Resumes
        </Button>

        {/* Header: Name, Save, Template, Download */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6 border-b pb-4">
          {/* Resume Name Input */}
          <Input
            value={editedName}
            onChange={handleNameChange} // Use specific handler with debounce
            placeholder="Enter resume name"
            className="text-xl font-semibold flex-grow" // Make name input prominent
          />
          {/* Controls Group */}
          <div className="flex gap-2 items-center self-start sm:self-center w-full sm:w-auto flex-wrap">
              {/* Auto-Save Status */}
              <span className="text-xs text-muted-foreground w-16 text-center order-last sm:order-first">{autoSaveStatus}</span>

              {/* Main Save Button */}
              <TooltipProvider> <Tooltip> <TooltipTrigger asChild>
                <Button onClick={handleSaveChanges} disabled={isSaving} size="icon" aria-label="Save all changes">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
                </Button>
              </TooltipTrigger> <TooltipContent><p>Save All Changes</p></TooltipContent> </Tooltip> </TooltipProvider>

              {/* Template Selector */}
              <div className="flex items-center gap-1">
                  <Label htmlFor="template-select" className="text-xs whitespace-nowrap">Template:</Label>
                  <Select value={selectedTemplate} onValueChange={(value: 'classic') => setSelectedTemplate(value)}>
                      <SelectTrigger id="template-select" className="w-auto h-9 text-xs"> <SelectValue /> </SelectTrigger>
                      <SelectContent> <SelectItem value="classic">Classic</SelectItem> </SelectContent>
                  </Select>
              </div>

              {/* PDF Download */}
              <TooltipProvider> <Tooltip> <TooltipTrigger asChild>
                {/* Conditionally render Link only when resumeData is available */}
                {resumeData ? (
                  <PDFDownloadLink
                    document={<ResumePDFDocument resume={currentResumeDataForPdf} templateName={selectedTemplate} />}
                    fileName={`<span class="math-inline">\{editedName\.trim\(\)\.replace\(/\[^a\-z0\-9\]/gi, '\_'\) \|\| 'resume'\}\_</span>{selectedTemplate}.pdf`}
                    onError={(error) => { console.error('PDF generation error:', error); toast.error('Failed to generate PDF.'); }}
                  >
                    {({ loading }) => (
                      <Button variant="outline" size="icon" disabled={loading} aria-label="Download PDF">
                         {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>}
                      </Button>
                    )}
                  </PDFDownloadLink>
                ) : (
                   // Render disabled button if resumeData is null
                   <Button variant="outline" size="icon" disabled={true} aria-label="Download PDF (Unavailable)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                   </Button>
                )}
              </TooltipTrigger> <TooltipContent><p>Download PDF ({selectedTemplate})</p></TooltipContent> </Tooltip> </TooltipProvider>
          </div>
        </div>

        {/* Rest of the sections */}
        
         <hr className="my-6" />
        
         <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
           <div className="space-y-1"> <Label htmlFor="contactEmail">Email</Label> <Input id="contactEmail" type="email" placeholder="your.email@example.com" value={contactEmail} onChange={handleContactEmailChange}/> </div>
           <div className="space-y-1"> <Label htmlFor="contactPhone">Phone</Label> <Input id="contactPhone" placeholder="(123) 456-7890" value={contactPhone} onChange={handleContactPhoneChange}/> </div>
           <div className="space-y-1"> <Label htmlFor="contactLinkedin">LinkedIn URL</Label> <Input id="contactLinkedin" placeholder="linkedin.com/in/yourprofile" value={contactLinkedin} onChange={handleContactLinkedinChange}/> </div>
           <div className="space-y-1"> <Label htmlFor="contactPortfolio">Portfolio URL</Label> <Input id="contactPortfolio" placeholder="yourportfolio.com" value={contactPortfolio} onChange={handleContactPortfolioChange}/> </div>
           <div className="space-y-1"> <Label htmlFor="contactLocation">Location</Label> <Input id="contactLocation" placeholder="City, State or Remote" value={contactLocation} onChange={handleContactLocationChange}/> </div>
         </div>
        
         <hr className="my-6" />
        
         <h2 className="text-xl font-semibold mb-4">Summary</h2>
         <div className="space-y-2">
           <Textarea value={summary || ''} onChange={handleSummaryChange} placeholder="Enter a brief summary..." className="h-32"/>
           <Button variant="outline" size="sm" type="button" onClick={handleEnhanceSummary} disabled={isEnhancingSummary}> {isEnhancingSummary ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing...</> : '✨ Enhance Summary'} </Button>
         </div>

        <hr className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4">Work Experience</h2>
        {experience.length === 0 ? <p className="text-muted-foreground text-sm">No experience added yet.</p> : (
           <div className="space-y-4 mb-4"> {experience.map((entry) => ( <div key={entry.id} className="p-3 border rounded-lg flex items-start justify-between gap-4"> <div className="flex-grow"> <h3 className="font-medium">{entry.jobTitle}</h3> <p className="text-sm text-muted-foreground">{entry.company}</p> <p className="text-xs text-muted-foreground">{entry.startDate} - {entry.endDate}</p> </div> <div className="flex gap-1 flex-shrink-0"> <Button variant="outline" size="sm" onClick={() => { setEditingEntry(entry); setNewJobTitle(entry.jobTitle); setNewCompany(entry.company); setNewStartDate(entry.startDate); setNewEndDate(entry.endDate); setNewDescription(entry.description); setIsAddExpModalOpen(true); }}>Edit</Button> <AlertDialog> <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Delete</Button></AlertDialogTrigger> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Are you sure?</AlertDialogTitle> <AlertDialogDescription>This will permanently delete this experience entry.</AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={() => handleDeleteExperience(entry.id)}>Delete</AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> </div> </div> ))} </div>
        )}
         <Button variant="outline" size="sm" onClick={() => { setEditingEntry(null); setNewJobTitle(''); setNewCompany(''); setNewStartDate(''); setNewEndDate(''); setNewDescription(''); setIsAddExpModalOpen(true); }}>Add Experience</Button>
        
        <hr className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4">Education</h2>
         {education.length === 0 ? <p className="text-muted-foreground text-sm">No education added yet.</p> : (
             <ul className="space-y-4 mb-4"> {education.map((entry) => ( <li key={entry.id} className="flex justify-between items-start p-3 border rounded gap-4"> <div className="flex-grow"> <h3 className="font-medium">{entry.schoolName}</h3> <p className="text-sm text-muted-foreground">{entry.degree}{entry.fieldOfStudy && ` - ${entry.fieldOfStudy}`}</p> <p className="text-xs text-muted-foreground">{entry.startDate} - {entry.endDate}</p> </div> <div className="flex gap-1 flex-shrink-0"> <Button variant="outline" size="sm" onClick={() => { setEditingEduEntry(entry); setNewSchoolName(entry.schoolName); setNewDegree(entry.degree); setNewFieldOfStudy(entry.fieldOfStudy || ''); setNewEduStartDate(entry.startDate); setNewEduEndDate(entry.endDate); setNewEduNotes(entry.notes || ''); setIsAddEduModalOpen(true); }}>Edit</Button> <AlertDialog> <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Delete</Button></AlertDialogTrigger> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Are you sure?</AlertDialogTitle> <AlertDialogDescription>This will permanently delete this education entry.</AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={() => handleDeleteEducation(entry.id)}>Delete</AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> </div> </li> ))} </ul>
         )}
         <Button variant="outline" size="sm" onClick={() => { setEditingEduEntry(null); setNewSchoolName(''); setNewDegree(''); setNewFieldOfStudy(''); setNewEduStartDate(''); setNewEduEndDate(''); setNewEduNotes(''); setIsAddEduModalOpen(true); }}>Add Education</Button>

        <hr className="my-6" />
        
         <h2 className="text-xl font-semibold mb-4">Skills</h2>
         {skills.length > 0 && (
             <div className="flex flex-wrap gap-2 mb-4"> {skills.map((skill, index) => ( <div key={index} className="flex items-center bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm font-medium"> <span>{skill}</span> <button onClick={() => handleDeleteSkill(skill)} className="ml-2 text-destructive hover:text-destructive/80 font-bold text-xs leading-none" aria-label={`Remove ${skill}`}>&times;</button> </div> ))} </div>
         )}
         <div className="flex gap-2 items-center">
             <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a new skill" className="flex-grow" onKeyDown={(e) => { if (e.key === 'Enter' && newSkill.trim()) handleAddSkill(); }} />
             <Button onClick={handleAddSkill} disabled={!newSkill.trim()}>Add Skill</Button>
             <TooltipProvider> <Tooltip> <TooltipTrigger asChild>
                 <Button variant="outline" size="icon" onClick={handleSuggestSkills} disabled={isSuggestingSkills || isLoading} aria-label="Suggest Skills"> {isSuggestingSkills ? <Loader2 className="h-4 w-4 animate-spin" /> : '✨'} </Button>
             </TooltipTrigger> <TooltipContent><p>Suggest Skills with AI</p></TooltipContent> </Tooltip> </TooltipProvider>
         </div>

         {/* Suggestions Section */}
         <div className="mt-4 min-h-[60px]">
             {isSuggestingSkills && <div className="flex items-center text-muted-foreground text-sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading suggestions...</div>}
             {suggestSkillsError && <p className="text-red-500 text-sm">Error: {suggestSkillsError}</p>}
             {!isSuggestingSkills && !suggestSkillsError && suggestedSkills.length > 0 && (
                 <div className="p-3 border rounded-md bg-secondary/50">
                     <div className="flex justify-between items-center mb-2">
                       <h4 className="font-semibold text-sm">Suggested Skills:</h4>
                       <Button variant="ghost" size="sm" onClick={() => setSuggestedSkills([])} className="text-xs h-auto px-2 py-1">Clear</Button>
                     </div>
                     <ul className="flex flex-wrap gap-2"> {suggestedSkills.map((skill) => ( <li key={skill}> <Button variant="outline" size="sm" onClick={() => handleAddSuggestedSkill(skill)} disabled={skills.includes(skill)} className={`h-auto px-2 py-1 text-xs ${skills.includes(skill) ? "opacity-50 cursor-not-allowed" : ""}`}> {skill} + </Button> </li> ))} </ul>
                 </div>
             )}
         </div>

         {/* --- Modals --- */}
          {/* Experience Dialog/Modal Component - Ensure this is defined */}
         <Dialog open={isAddExpModalOpen} onOpenChange={(open) => { setIsAddExpModalOpen(open); if (!open) setEditingEntry(null); }}>
             <DialogContent className="sm:max-w-[600px]">
                 <DialogHeader><DialogTitle>{editingEntry ? 'Edit Experience' : 'Add New Experience'}</DialogTitle></DialogHeader>
                 <div className="grid gap-4 py-4">
                    {/* Job Title */}
                    <div className="grid gap-2"><Label htmlFor="jobTitle">Job Title</Label><Input id="jobTitle" placeholder="Software Engineer" value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} /></div>
                    {/* Company */}
                    <div className="grid gap-2"><Label htmlFor="company">Company</Label><Input id="company" placeholder="Tech Corp" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} /></div>
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="grid gap-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" placeholder="YYYY-MM" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} /></div>
                       <div className="grid gap-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" placeholder="YYYY-MM or Present" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} /></div>
                    </div>
                    {/* Description */}
                    <div className="grid gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" placeholder="Describe your role..." className="h-32" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                      <Button variant="outline" size="sm" type="button" className="mt-2 justify-self-start" onClick={handleEnhanceDescription} disabled={isEnhancing}> {isEnhancing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing...</> : '✨ Enhance with AI'} </Button>
                    </div>
                 </div>
                 <DialogFooter> <Button variant="ghost" onClick={() => { setIsAddExpModalOpen(false); setEditingEntry(null); }}>Cancel</Button> <Button onClick={handleSaveExperience} disabled={isSaving}>{isSaving ? 'Saving...' : (editingEntry ? 'Update Experience' : 'Save Experience')}</Button> </DialogFooter>
             </DialogContent>
         </Dialog>

          {/* Education Dialog/Modal Component - Ensure this is defined */}
         <Dialog open={isAddEduModalOpen} onOpenChange={(open) => { setIsAddEduModalOpen(open); if (!open) setEditingEduEntry(null); }}>
             <DialogContent className="sm:max-w-[600px]">
                <DialogHeader><DialogTitle>{editingEduEntry ? 'Edit Education' : 'Add Education'}</DialogTitle></DialogHeader>
                 <div className="grid gap-4 py-4">
                     {/* School Name */}
                    <div className="grid gap-2"><Label htmlFor="schoolName">School Name</Label><Input id="schoolName" placeholder="University of Example" value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)}/></div>
                     {/* Degree */}
                    <div className="grid gap-2"><Label htmlFor="degree">Degree</Label><Input id="degree" placeholder="Bachelor of Science" value={newDegree} onChange={(e) => setNewDegree(e.target.value)} /></div>
                     {/* Field of Study */}
                    <div className="grid gap-2"><Label htmlFor="fieldOfStudy">Field of Study (Optional)</Label><Input id="fieldOfStudy" placeholder="Computer Science" value={newFieldOfStudy} onChange={(e) => setNewFieldOfStudy(e.target.value)} /></div>
                     {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="grid gap-2"><Label htmlFor="eduStartDate">Start Date</Label><Input id="eduStartDate" placeholder="YYYY-MM" value={newEduStartDate} onChange={(e) => setNewEduStartDate(e.target.value)} /></div>
                       <div className="grid gap-2"><Label htmlFor="eduEndDate">End Date</Label><Input id="eduEndDate" placeholder="YYYY-MM or Present" value={newEduEndDate} onChange={(e) => setNewEduEndDate(e.target.value)} /></div>
                    </div>
                     {/* Notes */}
                    <div className="grid gap-2"><Label htmlFor="eduNotes">Notes (Optional)</Label><Textarea id="eduNotes" placeholder="Additional details..." className="h-24" value={newEduNotes} onChange={(e) => setNewEduNotes(e.target.value)} /></div>
                 </div>
                 <DialogFooter> <Button variant="ghost" onClick={() => { setIsAddEduModalOpen(false); setEditingEduEntry(null); }}>Cancel</Button> <Button onClick={handleSaveEducationEntry} disabled={isSaving}>{isSaving ? 'Saving...' : (editingEduEntry ? 'Update Education' : 'Save Education')}</Button> </DialogFooter>
             </DialogContent>
         </Dialog>

      </div>
    </div>
  );
}