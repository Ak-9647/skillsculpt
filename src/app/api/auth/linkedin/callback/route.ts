import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    console.log('DEBUG: Callback route entered');
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    // Debug logging
    console.log('DEBUG: LinkedIn Callback Parameters:');
    console.log('- URL:', request.url);
    console.log('- Code:', code ? 'Present' : 'Missing');
    console.log('- State:', state);
    console.log('- Error:', error || 'None');
    console.log('- Error Description:', error_description || 'None');

    // Handle error cases
    if (error) {
      const errorMessage = error_description || 'LinkedIn authentication failed';
      console.log('DEBUG: LinkedIn returned error:', errorMessage);
      return NextResponse.redirect(
        new URL(`/dashboard/linkedin?linkedin_error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.log('DEBUG: Missing required parameters');
      return NextResponse.redirect(
        new URL('/dashboard/linkedin?linkedin_error=Missing required parameters', request.url)
      );
    }

    // Get all cookies for debugging
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('DEBUG: All cookies:', allCookies.map(c => c.name));
    
    // Verify state parameter matches stored state
    const storedState = cookieStore.get('linkedin_oauth_state')?.value;
    console.log('DEBUG: Stored state:', storedState);
    
    if (!storedState || storedState !== state) {
      console.log('DEBUG: State mismatch or missing');
      console.log('- Stored state:', storedState);
      console.log('- Received state:', state);
      return NextResponse.redirect(
        new URL('/dashboard/linkedin?linkedin_error=Invalid state parameter', request.url)
      );
    }

    // Exchange code for access token and ID token
    console.log('DEBUG: Exchanging code for token');
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('DEBUG: Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/dashboard/linkedin?linkedin_error=Failed to exchange code for token', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('DEBUG: Token received successfully');

    // Fetch user info using the userinfo endpoint
    console.log('DEBUG: Fetching user info');
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('DEBUG: UserInfo fetch failed:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/linkedin?linkedin_error=Failed to fetch user info', request.url)
      );
    }

    const userInfo = await userInfoResponse.json();
    console.log('DEBUG: UserInfo received successfully:', {
      sub: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email ? 'Present' : 'Missing',
    });

    // Get the Firebase user ID from the session
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      console.log('DEBUG: No session cookie found');
      return NextResponse.redirect(
        new URL('/dashboard/linkedin?linkedin_error=No active session found', request.url)
      );
    }

    console.log('DEBUG: Verifying session cookie');
    const decodedClaims = await auth.verifySessionCookie(sessionCookie);
    const userId = decodedClaims.uid;
    console.log('DEBUG: Session verified, user ID:', userId);

    // Calculate token expiration (1 hour from now)
    const expiresAt = Date.now() + (3600 * 1000);

    // Prepare token data for Firestore
    const tokenDataForFirestore = {
      accessToken: tokenData.access_token,
      expiresAt,
      createdAt: Date.now(),
      userId: userInfo.sub
    };

    console.log('DEBUG: About to save token to Firestore:', {
      userId,
      path: `users/${userId}/linkedinAuth/tokenData`,
      data: {
        ...tokenDataForFirestore,
        accessToken: tokenDataForFirestore.accessToken.substring(0, 5) + '...'
      }
    });

    try {
      await db.collection('users').doc(userId)
        .collection('linkedinAuth').doc('tokenData')
        .set(tokenDataForFirestore);
      console.log('DEBUG: Successfully saved token to Firestore');
    } catch (firestoreError) {
      console.error('DEBUG: Firestore write error:', {
        error: firestoreError,
        message: firestoreError instanceof Error ? firestoreError.message : 'Unknown error',
        code: (firestoreError as any)?.code,
        path: `users/${userId}/linkedinAuth/tokenData`
      });
      throw firestoreError;
    }

    // Create the response with redirect
    return NextResponse.redirect(
      new URL('/dashboard/linkedin?linkedin_connected=true', request.url)
    );

  } catch (error) {
    console.error('DEBUG: Callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/linkedin?linkedin_error=Internal server error', request.url)
    );
  }
} 