'use client';

import dynamic from 'next/dynamic';

// Use path alias assuming '@/' points to 'src/' in tsconfig.json
const SignUpForm = dynamic(() => import('./SignUpForm'), { ssr: false });

export default function SignUpPage() {
  return <SignUpForm />;
}