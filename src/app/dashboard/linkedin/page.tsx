'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import Image from 'next/image';

interface LinkedInProfileData {
  name: string | null;
  pictureUrl: string | null;
  headline: string | null;
  summary: string | null;
}

interface DetailedProfileData {
  headline: string | null;
  summary: string | null;
}

const generateRandomString = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0].toString(36);
};

export default function LinkedInDashboard() {
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<LinkedInProfileData | null>(null);

  // Headline section state
  const [currentHeadline, setCurrentHeadline] = useState<string | null>(null);
  const [suggestedHeadline, setSuggestedHeadline] = useState<string | null>(null);
  const [headlineLoading, setHeadlineLoading] = useState(false);
  const [headlineError, setHeadlineError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleLinkedInCallback = async (user: User | null) => {
      // Check for error in URL params
      const linkedinError = searchParams.get('linkedin_error');
      if (linkedinError) {
        setError(decodeURIComponent(linkedinError));
        return;
      }

      // Check for callback state
      const callbackState = searchParams.get('linkedin_callback_state');
      if (!callbackState) return;

      console.log('DEBUG: LinkedIn callback state detected:', callbackState);
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error('No authenticated user found');
        }

        console.log('DEBUG: Getting Firebase ID token');
        const idToken = await user.getIdToken();
        
        console.log('DEBUG: Making associate request');
        const response = await fetch('/api/linkedin/associate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ state: callbackState })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to associate LinkedIn account');
        }

        console.log('DEBUG: Successfully associated LinkedIn account');
        toast.success('LinkedIn account connected successfully!');
        
        // Load profile data
        const profileResponse = await fetch('/api/linkedin/profile/basic');
        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(errorData.error || 'Failed to load LinkedIn profile data');
        }

        const data = await profileResponse.json();
        setProfileData(data);
        setIsConnected(true);

        // Clear the callback state from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('linkedin_callback_state');
        window.history.replaceState({}, '', url.toString());

      } catch (err) {
        console.error('DEBUG: Error during LinkedIn association:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect LinkedIn account');
        toast.error('Failed to connect LinkedIn account');
      } finally {
        setIsLoading(false);
      }
    };

    // Set up auth state listener
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('DEBUG: Auth state changed:', user ? 'User logged in' : 'No user');
      handleLinkedInCallback(user);
    });

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      console.log('DEBUG: Cleaning up auth state listener');
      unsubscribe();
    };
  }, [searchParams]);

  const handleConnectLinkedIn = () => {
    const state = generateRandomString();
    
    // Store state in a cookie instead of sessionStorage
    document.cookie = `linkedin_oauth_state=${state}; path=/; max-age=3600; SameSite=Lax`;

    // Ensure redirect URI is properly formatted
    const redirectUri = process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/linkedin/callback';

    const linkedInAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    linkedInAuthUrl.searchParams.append('response_type', 'code');
    linkedInAuthUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID!);
    linkedInAuthUrl.searchParams.append('redirect_uri', redirectUri);
    linkedInAuthUrl.searchParams.append('state', state);
    linkedInAuthUrl.searchParams.append('scope', 'openid profile email');

    // Debug logging to help troubleshoot
    console.log('DEBUG: LinkedIn Auth URL parameters:');
    console.log('- redirect_uri:', redirectUri);
    console.log('- state:', state);
    console.log('- scope:', 'openid profile email');

    window.location.href = linkedInAuthUrl.toString();
  };

  const handleFetchEnhanceHeadline = async () => {
    setHeadlineLoading(true);
    setHeadlineError(null);
    setCurrentHeadline(null);
    setSuggestedHeadline(null);
    setIsCopied(false);

    try {
      // Get Firebase ID token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }
      const idToken = await user.getIdToken();

      // Fetch detailed profile data with Firebase token
      const response = await fetch('/api/linkedin/profile/detailed', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch headline');
      }

      const data: DetailedProfileData = await response.json();
      if (!data.headline) {
        throw new Error('No headline found in profile');
      }

      setCurrentHeadline(data.headline);

      // Enhance the headline using AI
      const enhanceResponse = await fetch('/api/ai/enhance-linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`, // Also include token for AI endpoint
        },
        body: JSON.stringify({
          text: data.headline,
          field: 'headline',
        }),
      });

      if (!enhanceResponse.ok) {
        const errorData = await enhanceResponse.json();
        throw new Error(errorData.error || 'Failed to enhance headline');
      }

      const enhanceData = await enhanceResponse.json();
      setSuggestedHeadline(enhanceData.suggestion);
    } catch (err) {
      setHeadlineError(err instanceof Error ? err.message : 'Failed to process headline');
    } finally {
      setHeadlineLoading(false);
    }
  };

  const handleCopySuggestion = async () => {
    if (!suggestedHeadline) return;
    
    try {
      await navigator.clipboard.writeText(suggestedHeadline);
      setIsCopied(true);
      toast.success('Suggestion copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy suggestion');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isConnected && profileData) {
    return (
      <div className="space-y-8 p-4">
        {/* Profile Header */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-4">
              {profileData.pictureUrl && (
                <Image
                  src={profileData.pictureUrl}
                  alt={`${profileData.name}'s profile`}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              )}
              <div>
                <CardTitle className="text-lg font-semibold">{profileData.name}</CardTitle>
                <p className="text-sm text-gray-500">LinkedIn Profile Connected</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Headline Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Professional Headline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleFetchEnhanceHeadline}
              disabled={headlineLoading}
            >
              {headlineLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Fetch & Enhance Headline'
              )}
            </Button>

            {headlineError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{headlineError}</p>
              </div>
            )}

            {currentHeadline && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Headline</label>
                <Textarea
                  value={currentHeadline}
                  readOnly
                  className="min-h-[80px]"
                />
              </div>
            )}

            {suggestedHeadline && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enhanced Headline</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopySuggestion}
                    className="flex items-center gap-2"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={suggestedHeadline}
                  readOnly
                  className="min-h-[80px]"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">About/Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Button>Fetch & Enhance Summary</Button>
          </CardContent>
        </Card>

        {/* Experience Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Work Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <Button>Fetch & Enhance Experience</Button>
          </CardContent>
        </Card>

        {/* Education Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Education</CardTitle>
          </CardHeader>
          <CardContent>
            <Button>Fetch & Enhance Education</Button>
          </CardContent>
        </Card>

        {/* Skills Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <Button>Fetch & Enhance Skills</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default view - Not connected
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Connect Your LinkedIn Profile</h1>
        <p className="text-gray-600">
          Connect your LinkedIn account to enhance your resume with AI-powered suggestions
          based on your professional experience and skills.
        </p>
        <Button
          onClick={handleConnectLinkedIn}
          className="mt-4"
        >
          Connect LinkedIn Account
        </Button>
      </div>
    </div>
  );
} 