import * as admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Initialize services
const auth = admin.auth();
const db = admin.firestore();

// Export both services
export { auth, db }; 
    console.log('DEBUG: Starting Firebase Admin initialization');
    console.log('DEBUG: Firebase Admin SDK version:', admin.SDK_VERSION);
    
    // TEMPORARY DEBUGGING - Using hardcoded credentials
    const serviceAccountCredentials = {
      projectId: "car-magic-454906",
      clientEmail: "firebase-adminsdk-fbsvc@car-magic-454906.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC44xN2TKwTmzwS\nr1qCaOrlJ+Qa84jhby/1+YVnJ6KnTe6yM9rU4wXYwxvR3wprwm3zu0msAKRq+Tap\nFiitTMm93mYTc+b5dC4L6g8/M92rqHRtXtn4m0kDGiCA4hwH9ZNNyJDyAHZDeP8O\npCrDo6ize3AiJ9SJIcUjHCw8B+fvmYf0B3/rmwslutVd6EokzOLX+izzoN+yNyyc\nRsoG8NYBBIEbooyVeP9quycZHFeZkvAvRPgC9ZWsjTYuN4JxgQLupRgxWgVy/tmy\nY/2aqvQe/+CH9GjGdcglQw8j5Vav3PMdwDn4efk3B0DIxGQez46NqgwTI7/DXfxE\n5M1LZrX1AgMBAAECggEAJv2UdCVVQMlDEPm0D76KkwsnmttzKX+mUKxvisKcFcZk\nqWYwJyc9a2oyKr9r1i/pujXsIn78Laci9OO8ble8T/Nf+Yg+1KrArziMQJryi6n5\n67rOIxS0gBf5dNS6bp9GkmfS0YZxamdQ+sh6UEnqYPeOPVXDB6x8g5wEZCCStD+D\ngYysVTAWt2yT8bKwbbKpwARSyyvqqCyG5WYqcfn7zvO3lFg3E/ixZ8GsZXPdvkhY\n+eAZmFs1WCJzumNhjX63RXPKNKRgjhs+xFUZeY6lsqVStkUV+IZMb7b8xgJZe3Ag\nje3NXFH7VIlJfIMKKwRK1xo3ybeeK3Gw9xAuGkJH3QKBgQDtxLYgjTGJv5gksLm2\n5UKZlRXhvRSwZBHdFUKUC5+sAAP9706l8UpFB/j4h6TGCWq+f/t0c2PFdDN35heZ\nw5uv5NZAxyFHd1wfLC030knb8u0kwBzcjlZiZsf0IUETAo+f3tNbYNnvillnx9Pd\nwQswfzQwfGPKdxdMQmAJOKMd0wKBgQDHEFOKts/5UqmxsKvERStZkSqqGEmBv1Vk\n1GcID8uHJ6rV9779jN3s/+I92NRc5pmaUHzGjGMpHzggnvAQ99UyEKkBmezHDM9L\n0qiwlK48bxGdk/IRStgMocNaVsTMovSHPM6d6MjZc2VeWeTAHlZdXSSetNwmzruh\nmpYB3/fYFwKBgBARhDFs+VUS0qhgHRzkH30bmy/3REera52iSy6QHolUMvDdVFZY\nmSlTIZtCJ3uOtV0MbyTui2aTtMq8jQnCM2pOr8AO9QvMYDhnFuM33e/0Wdxq80hg\ngiwCQC8adDhhqu0l9OivAetzURl3YrUQz73GSvOf5GqRY8yui6jz3+orAoGAUt6+\nGKpAbGf4UwvchgnRoSjo3QTdXRFdKGuwNM/2h96ApTDNJtrE7Mwd0Gd7CO3LFk3Z\nlAKPqWfgwtvHzxiNfZkn8o2036y6g7NAHLrYyjnm2HXluUMyLBgProUeyp4wNDih\nP2XQb441rhC4RS6b/6QuAZADcnhv7jffqQonMKMCgYB2O6AO/+fk32gvTp8JTYXo\nv+0dDrIHomTN2iTwObi36qXlwgkLXEbpnGfEP3GctYWEMJCTlS/6qnKkKUFNZV8g\nIFKHUCuQUvBDW8jqXsUndCb4vKT5+9MYqnhhmogCyvQ1KNQLyD+wxmQr/L/PSoX4\n7XkIev1Cbin2SBmv0yO7sw==\n-----END PRIVATE KEY-----\n"
    };

    console.log("DEBUG: Credentials object being passed:", JSON.stringify(serviceAccountCredentials, null, 2));
    console.log("DEBUG: admin.credential.cert available:", !!admin.credential?.cert);
    
    const cert = admin.credential.cert(serviceAccountCredentials);
    console.log("DEBUG: Certificate created successfully");
    
    admin.initializeApp({
      credential: cert,
      projectId: serviceAccountCredentials.projectId
    });
    console.log('DEBUG: Firebase Admin initialized with hardcoded credentials');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error);
    console.error('Error details:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace'
    });
    throw error; // Re-throw to prevent silent failures
  }
}

export const auth = admin.auth();
export const db = admin.firestore(); 