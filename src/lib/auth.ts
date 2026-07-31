import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Attempt to initialize Firebase Admin SDK.
// It will look for the GOOGLE_APPLICATION_CREDENTIALS environment variable.
try {
  if (!getApps().length) {
    initializeApp();
  }
} catch (e) {
  console.warn('Firebase Admin SDK failed to initialize. Please check your credentials.');
}

export const verifyFirebaseToken = async (token: string) => {
  if (process.env.NODE_ENV === 'development' && !getApps().length) {
    // For local development before Firebase is fully configured
    return {
      uid: 'dev-mock-uid-' + Math.floor(Math.random() * 1000),
      email: 'mockuser@example.com',
      name: 'Mock User'
    };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid Firebase token');
  }
};
