
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isConfigured } from './config.js';

export async function signInWithGoogle() {
  if (!isConfigured) {
    console.warn('[StealthChess] Firebase not configured. Auth disabled.');
    return null;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('[StealthChess] Auth error:', err.message);
    return null;
  }
}

export async function logOut() {
  if (!isConfigured || !auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[StealthChess] Sign-out error:', err.message);
  }
}

export function onAuthChange(callback) {
  if (!isConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
