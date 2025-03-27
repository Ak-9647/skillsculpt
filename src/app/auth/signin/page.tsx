'use client';

import dynamic from 'next/dynamic';

// Use path alias assuming '@/' points to 'src/' in tsconfig.json
// This imports SignInForm.tsx from the current 'signin' directory using the alias
const SignInForm = dynamic(() => import('@/app/auth/signin/SignInForm'), {
  ssr: false
});

export default function SignInPage() {
  return <SignInForm />;
}