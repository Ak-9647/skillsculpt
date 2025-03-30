'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

export default function LinkedInOptimizerPage() {

  const handleConnectLinkedIn = () => {
    console.log('Initiating LinkedIn connection...');

    // 1. Get config from environment variables
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID as string;
    const redirectUri = process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI as string;
    const scope = 'openid profile email'; // Standard OIDC scopes

    // Basic validation
    if (!clientId) {
      alert('LinkedIn Client ID (NEXT_PUBLIC_LINKEDIN_CLIENT_ID) is not configured in .env.local');
      console.error('Missing NEXT_PUBLIC_LINKEDIN_CLIENT_ID');
      return;
    }
    if (!redirectUri) {
      alert('LinkedIn Redirect URI (NEXT_PUBLIC_LINKEDIN_REDIRECT_URI) is not configured in .env.local');
      console.error('Missing NEXT_PUBLIC_LINKEDIN_REDIRECT_URI');
      return;
    }

    // 2. Generate and store state parameter
    const state = window.crypto.randomUUID();
    try {
      sessionStorage.setItem('linkedin_oauth_state', state);
      console.log('Stored state for verification:', state);
    } catch (e) {
      console.error("Error storing state in sessionStorage:", e);
      alert("Error preparing LinkedIn login. Cannot store state.");
      return;
    }

    // 3. Construct LinkedIn Authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', scope);

    console.log('Redirecting user to:', authUrl.toString());

    // 4. Redirect user's browser
    window.location.href = authUrl.toString();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
       <h1 className="text-2xl font-semibold mb-6">LinkedIn Profile Optimizer</h1>
       <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
         <p className="mb-4 text-gray-600">
           Connect your LinkedIn account to get AI-powered suggestions
           for improving your profile headline, summary, and more.
         </p>
         <Button onClick={handleConnectLinkedIn}>
           Connect LinkedIn Account
         </Button>
       </div>
       {/* TODO: Add UI for displaying profile info later */}
    </div>
  );
} 