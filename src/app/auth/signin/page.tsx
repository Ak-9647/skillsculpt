'use client';

import dynamic from 'next/dynamic';

const SignInForm = dynamic(() => import('./SignInForm'), {
  ssr: false
});

export default function SignInPage() {
  return <SignInForm />;
} 