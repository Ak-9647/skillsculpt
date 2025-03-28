import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Briefcase, Target, BarChart } from 'lucide-react'; // Example icons

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-grow flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b dark:from-slate-900 dark:to-slate-800 from-white to-gray-100">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl mb-4">
            Sculpt Your <span className="text-blue-600 dark:text-blue-400">Career Path</span>
          </h1>
          <p className="mt-3 text-base text-gray-600 dark:text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
            Build the perfect resume, optimize your profiles, and land your dream job with AI-powered tools designed for success.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            {/* ***** CHANGED href HERE ***** */}
            <Link href="/auth/signup" passHref>
              <Button size="lg">Get Started</Button>
            </Link>
            {/* ***** CHANGED href HERE ***** */}
            <Link href="/auth/signin" passHref>
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            How SkillSculpt Helps You Succeed
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                   <Briefcase className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>AI Resume Builder</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Craft compelling resumes tailored to specific job descriptions using intelligent suggestions.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="text-center">
              <CardHeader>
                 <div className="flex justify-center mb-4">
                  <Target className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                 </div>
                <CardTitle>Profile Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Enhance your LinkedIn and other professional profiles to attract recruiters and opportunities.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="text-center">
              <CardHeader>
                 <div className="flex justify-center mb-4">
                  <BarChart className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                 </div>
                <CardTitle>Application Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  (Coming Soon) Manage your job applications efficiently in one centralized place.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-100 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} SkillSculpt. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}