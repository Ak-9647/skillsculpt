'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,        // <-- Added import
  signInWithPopup,           // <-- Added import
  AuthError 
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handler for Email/Password Sign Up
  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/dashboard'); // Redirect to dashboard on successful signup
    } catch (err) {
      console.error('Signup error:', err);
      if (err instanceof Error) {
        const authError = err as AuthError;
        switch (authError.code) {
          case 'auth/email-already-in-use':
            setError('This email is already registered. Please sign in instead.');
            break;
          case 'auth/invalid-email':
            setError('Please enter a valid email address.');
            break;
          case 'auth/weak-password':
            setError('Password should be at least 6 characters long.');
            break;
          // Handle the specific API key error if needed, though it should be fixed now
          case 'auth/invalid-api-key': // Corrected potential typo from previous logs if needed
             setError('Configuration error. Please contact support.');
             break;
          case 'auth/api-key-not-valid': // Corrected potential typo from previous logs if needed
             setError('Configuration error. Please contact support.');
             break;
          default:
            setError('An error occurred during signup. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Added Google Sign-In Handler ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard'); // Redirect to dashboard on successful Google sign-in/signup
    } catch (err) {
      console.error('Google sign in error:', err);
      if (err instanceof Error) {
        const authError = err as AuthError;
        // Don't show popup closed as a blocking error
        if (authError.code !== 'auth/popup-closed-by-user') {
           // Handle the specific API key error if needed
           if (authError.code === 'auth/invalid-api-key' || authError.code === 'auth/api-key-not-valid') {
             setError('Configuration error during Google Sign-in. Please contact support.');
           } else {
             setError('An error occurred during Google sign in. Please try again.');
           }
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false); // Ensure loading is set to false even if popup is closed
    }
  };
  // --- End Added Handler ---

  return (
    // Removed outer div with bg-gray-50 to allow page background to show if needed
    <Card className="w-full max-w-md mx-auto my-12 shadow-lg"> 
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              disabled={loading} // Disable fields when loading
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              disabled={loading} // Disable fields when loading
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 pt-2"> {/* Added padding top */}
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up with Email'}
          </Button>
        </form>

        {/* --- Added Divider and Google Button --- */}
        <div className="relative my-6"> {/* Increased spacing */}
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground"> {/* Use bg-card for theme awareness */}
              Or
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {/* Re-using the SVG from SignInForm */}
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          {/* Text can be generic, Google handles sign in vs sign up */}
          {loading ? 'Processing...' : 'Sign in with Google'} 
        </Button>
        {/* --- End Added Section --- */}

        {/* Link to Sign In */}
        <div className="mt-6 text-center text-sm"> {/* Increased spacing */}
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}