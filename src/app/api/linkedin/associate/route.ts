import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    console.log('DEBUG: Associate endpoint entered');

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

    // Get state from request body
    const { state } = await request.json();
    if (!state) {
      console.log('DEBUG: No state parameter provided in request body');
      return NextResponse.json(
        { error: 'Bad Request - Missing state parameter' },
        { status: 400 }
      );
    }

    console.log('DEBUG: Attempting to read temporary token with state:', state);
    
    // Get temporary token data
    const tempTokenDoc = await db.collection('tempLinkedInTokens').doc(state).get();
    
    if (!tempTokenDoc.exists) {
      console.log('DEBUG: No temporary token found for state:', state);
      return NextResponse.json(
        { error: 'Not Found - Temporary token not found or expired' },
        { status: 404 }
      );
    }

    const tempTokenData = tempTokenDoc.data();
    console.log('DEBUG: Temporary token data retrieved:', {
      hasAccessToken: !!tempTokenData?.accessToken,
      accessTokenPrefix: tempTokenData?.accessToken ? tempTokenData.accessToken.substring(0, 5) + '...' : 'none',
      expiresAt: tempTokenData?.expiresAt,
      currentTime: Date.now()
    });

    if (!tempTokenData?.accessToken) {
      console.log('DEBUG: LinkedIn access token missing in temporary data');
      return NextResponse.json(
        { error: 'Bad Request - Invalid temporary token data' },
        { status: 400 }
      );
    }

    if (tempTokenData.expiresAt < Date.now()) {
      console.log('DEBUG: Temporary token expired:', {
        expiresAt: tempTokenData.expiresAt,
        currentTime: Date.now(),
        difference: (tempTokenData.expiresAt - Date.now()) / 1000 / 60 + ' minutes'
      });
      return NextResponse.json(
        { error: 'Gone - Temporary token expired' },
        { status: 410 }
      );
    }

    // Prepare permanent token data
    const permanentTokenData = {
      accessToken: tempTokenData.accessToken,
      expiresAt: tempTokenData.expiresAt,
      createdAt: tempTokenData.createdAt,
      linkedInUserId: tempTokenData.linkedInUserId,
      linkedInName: tempTokenData.linkedInName,
      linkedInEmail: tempTokenData.linkedInEmail
    };

    console.log('DEBUG: About to save permanent token to Firestore:', {
      userId,
      path: `users/${userId}/linkedinAuth/tokenData`,
      data: {
        ...permanentTokenData,
        accessToken: permanentTokenData.accessToken.substring(0, 5) + '...'
      }
    });

    // Save permanent token data
    await db.collection('users').doc(userId)
      .collection('linkedinAuth').doc('tokenData')
      .set(permanentTokenData);
    console.log('DEBUG: Successfully saved permanent token to Firestore');

    // Delete temporary token
    await db.collection('tempLinkedInTokens').doc(state).delete();
    console.log('DEBUG: Successfully deleted temporary token');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('DEBUG: Associate endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
 