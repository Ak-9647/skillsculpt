'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LinkedInDashboardContent from './LinkedInDashboardContent';

export default function LinkedInDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <LinkedInDashboardContent />
    </Suspense>
  );
} 