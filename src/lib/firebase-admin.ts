import * as admin from 'firebase-admin';

// Define service account credentials
const serviceAccountCredentials = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    console.log("DEBUG: Initializing Firebase Admin");
    console.log("DEBUG: admin.credential available:", !!admin.credential);
    console.log("DEBUG: admin.credential.cert available:", !!admin.credential?.cert);
    
    const cert = admin.credential.cert(serviceAccountCredentials);
    console.log("DEBUG: Certificate created successfully");
    
    admin.initializeApp({
      credential: cert,
      projectId: serviceAccountCredentials.projectId
    });
    console.log('DEBUG: Firebase Admin initialized with credentials');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error; // Re-throw to prevent silent failures
  }
}

// Export the initialized Firebase Admin instances
export const auth = admin.auth();
export const db = admin.firestore(); 