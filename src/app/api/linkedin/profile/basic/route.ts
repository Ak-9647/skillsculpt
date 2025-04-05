import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    console.log('DEBUG: Starting GET handler for /api/linkedin/profile/basic');
    
    // Get and verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    console.log('DEBUG: Raw Authorization header:', authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('DEBUG: Invalid auth header format - missing or invalid Bearer prefix');
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid Bearer token' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    console.log('DEBUG: Extracted ID token (first 10 chars):', idToken.substring(0, 10) + '...');
    
    let decodedToken;
    try {
      console.log('DEBUG: Attempting to verify ID token with Firebase Admin');
      decodedToken = await auth.verifyIdToken(idToken);
      console.log('DEBUG: Token verification successful');
    } catch (error) {
      console.error('DEBUG: Token verification error:', error);
      const errorMessage = error instanceof Error 
        ? `Token verification failed: ${error.message}`
        : 'Token verification failed';
      return NextResponse.json(
        { error: 'Unauthorized - ' + errorMessage },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    console.log('DEBUG: Successfully authenticated user:', userId);

    // Get LinkedIn token from Firestore
    const docPath = `users/${userId}/linkedinAuth/tokenData`;
    console.log('DEBUG: Attempting to read Firestore document:', docPath);
    
    const tokenDoc = await db.collection('users').doc(userId)
      .collection('linkedinAuth').doc('tokenData').get();

    console.log('DEBUG: Document exists:', tokenDoc.exists);
    
    if (!tokenDoc.exists) {
      console.log('DEBUG: No LinkedIn token document found for user:', userId);
      return NextResponse.json(
        { error: 'LinkedIn token not found - Please connect your LinkedIn account' },
        { status: 404 }
      );
    }

    const tokenData = tokenDoc.data();
    console.log('DEBUG: Token data retrieved:', {
      hasAccessToken: !!tokenData?.accessToken,
      accessTokenPrefix: tokenData?.accessToken ? tokenData.accessToken.substring(0, 5) + '...' : 'none',
      expiresAt: tokenData?.expiresAt,
      currentTime: Date.now()
    });

    const { accessToken, expiresAt } = tokenData || {};

    if (!accessToken) {
      console.log('DEBUG: LinkedIn access token missing in document for user:', userId);
      return NextResponse.json(
        { error: 'LinkedIn token data invalid - Please reconnect your LinkedIn account' },
        { status: 401 }
      );
    }

    if (expiresAt < Date.now()) {
      console.log('DEBUG: LinkedIn token expired for user:', userId, {
        expiresAt,
        currentTime: Date.now(),
        difference: (expiresAt - Date.now()) / 1000 / 60 + ' minutes'
      });
      return NextResponse.json(
        { error: 'LinkedIn token expired - Please reconnect your LinkedIn account' },
        { status: 401 }
      );
    }

    // Fetch user info from LinkedIn
    console.log('DEBUG: Fetching user info from LinkedIn');
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('DEBUG: LinkedIn API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch LinkedIn profile' },
        { status: userInfoResponse.status }
      );
    }

    const userInfo = await userInfoResponse.json();
    console.log('DEBUG: LinkedIn user info received:', {
      name: userInfo.name,
      email: userInfo.email ? 'Present' : 'Missing',
      picture: userInfo.picture ? 'Present' : 'Missing'
    });
    
    // Return the profile data
    return NextResponse.json({
      name: userInfo.name,
      email: userInfo.email,
      pictureUrl: userInfo.picture,
      linkedInId: userInfo.sub,
      locale: userInfo.locale,
    });

  } catch (error) {
    console.error('DEBUG: Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 