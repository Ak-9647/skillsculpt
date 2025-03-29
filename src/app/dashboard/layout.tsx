'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r">
        <nav className="p-6 space-y-2">
          <Link 
            href="/dashboard" 
            className={`block px-4 py-2 rounded-lg transition-colors ${
              isActive('/dashboard')
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/dashboard/resume" 
            className={`block px-4 py-2 rounded-lg transition-colors ${
              isActive('/dashboard/resume')
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Resume Builder
          </Link>
          {/* Add more navigation items here */}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
} 