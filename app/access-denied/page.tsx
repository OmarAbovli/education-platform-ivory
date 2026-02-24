import type { Metadata } from "next";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Access Denied | El-Helal",
  description: "You do not have the necessary permissions to access this page on El-Helal. Please log in with an authorized account or contact support.",
  robots: {
    index: false,
    follow: false,
  },
};



export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
      <p className="text-lg mb-8">You do not have permission to view this page.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Go to Home
      </Link>
    </div>
  );
}