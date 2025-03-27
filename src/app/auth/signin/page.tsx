'use client';

import dynamic from 'next/dynamic';

// Import path './SignInForm' should be correct as SignInForm.tsx is in the same directory
const SignInForm = dynamic(() => import('./SignInForm'), {
  ssr: false
});

export default function SignInPage() {
  return <SignInForm />;
}