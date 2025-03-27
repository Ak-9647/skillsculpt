'use client';

import dynamic from 'next/dynamic';

const SignUpForm = dynamic(() => import('./SignUpForm'), {
  ssr: false
});

export default function SignUpPage() {
  return <SignUpForm />;
} 