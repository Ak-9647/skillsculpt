# SkillSculpt - AI-Powered Career Development Platform

SkillSculpt is a web application designed to help users enhance their career profiles using AI assistance. It provides tools for building resumes, optimizing LinkedIn profiles (planned), managing job applications (planned), and creating portfolios (planned), leveraging modern web technologies and Google Cloud AI.

## Features

* **Resume Builder:**
    * Create and manage multiple resume sections (Contact Info, Summary, Work Experience, Education, Skills).
    * CRUD functionality for Experience and Education entries.
    * Add/Delete skills.
    * Auto-save functionality for main text fields (Summary, Contact).
* **AI Text Enhancement:** Enhance work experience descriptions and summaries using Vertex AI (`enhance-resume-text` Cloud Function).
* **AI Skill Suggestion:** Get relevant skill suggestions based on resume content (`suggest-resume-skills` Cloud Function).
* **PDF Download:** Generate and download the resume as a PDF document using `@react-pdf/renderer` (currently uses a 'classic' template; styling issues may still exist).
* **User Authentication:** Managed via Firebase Authentication.
* **(Planned/Paused)** LinkedIn Profile Optimizer.
* **(Planned)** Job Application Tracker.
* **(Planned)** Portfolio Builder.

## Tech Stack

* **Frontend:** Next.js 14+ (App Router), React 19, TypeScript
* **UI:** Shadcn UI, Tailwind CSS
* **State Management:** React Hooks (`useState`, `useEffect`, etc.)
* **Backend Services:**
    * Firebase Authentication
    * Firestore (Database)
    * Google Cloud Functions (Gen 2, Node.js 20)
        * `enhance-resume-text` (us-central1)
        * `suggest-resume-skills` (us-central1)
* **AI:** Google Vertex AI (Gemini models)
* **PDF Generation:** `@react-pdf/renderer`
* **Deployment & CI/CD:**
    * Google Cloud Build
    * Google Cloud Run (for Next.js app - us-west2)
    * Google Artifact Registry (for Docker images)
    * Google Secret Manager (for API keys/secrets)
    * Docker

## Project Structure

* **`skillsculpt-app/`**: Main Next.js application directory.
    * **`src/app/`**: Core application routes and components.
    * **`src/components/`**: Reusable UI components.
    * **`src/lib/firebase/`**: Firebase configuration and initialization.
    * **`src/types/`**: TypeScript type definitions.
    * **`public/`**: Static assets (images, fonts).
        * `public/templates/`: May contain assets for PDF templates.
        * `public/fonts/`: Location for custom font files.
    * **`enhance-resume-text/`**: Source code for the text enhancement Cloud Function.
    * **`suggest-resume-skills/`**: Source code for the skill suggestion Cloud Function.
    * **`cloudbuild.yaml`**: Cloud Build pipeline configuration.
    * **`Dockerfile`**: Docker configuration for building the Next.js app container.
    * **`.env.local`**: Local environment variables (see below - DO NOT COMMIT).

## Getting Started (Local Development)

### Prerequisites

* Node.js (v20 or later recommended)
* npm, yarn, or pnpm
* Google Cloud SDK (`gcloud`) installed and configured (optional, for manual deployments)
* Firebase Project Setup (Authentication, Firestore enabled)
* Google Cloud Project Setup (Cloud Functions, Vertex AI, Secret Manager APIs enabled)

### Installation

1.  Clone the repository.
2.  Navigate to the project root directory (containing `skillsculpt-app`).
3.  Navigate into the application directory:
    ```bash
    cd skillsculpt-app
    ```
4.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```

### Environment Variables

Create a `.env.local` file in the `skillsculpt-app` directory for local development. Add the following variables:

```dotenv
# Firebase Config (Get from your Firebase project settings)
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# Cloud Function URLs (Get from manual deployment or Cloud Build output)
# Example URLs below - replace with your actual deployed URLs
NEXT_PUBLIC_ENHANCE_FUNCTION_URL=[https://enhance-resume-text-sirxstvtva-uc.a.run.app](https://enhance-resume-text-sirxstvtva-uc.a.run.app)
NEXT_PUBLIC_SUGGEST_SKILLS_FUNCTION_URL=[https://suggest-resume-skills-sirxstvtva-uc.a.run.app](https://suggest-resume-skills-sirxstvtva-uc.a.run.app)

# Add any other necessary environment variables (e.g., LinkedIn Client ID)
# NEXT_PUBLIC_LINKEDIN_CLIENT_ID=YOUR_LINKEDIN_ID