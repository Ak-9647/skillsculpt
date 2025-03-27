'use client';

import dynamic from 'next/dynamic';

// Corrected import path to go one level up from 'signup' directory
const SignUpForm = dynamic(() => import('../SignUpForm'), {
  ssr: false
});

export default function SignUpPage() {
  return <SignUpForm />;
}