"use client"

import { useEffect } from 'react';

export default function PaymobSuccessPage() {
  useEffect(() => {
    // Try to close the window automatically, which will work if it was opened by a script.
    window.close();
  }, []);

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-zinc-800 shadow-lg rounded-lg text-center">
        <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">تم الدفع بنجاح!</h1>
        <p className="mt-4 text-gray-700 dark:text-gray-300">
          جاري الآن إعداد حسابك.
        </p>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          يمكنك الآن إغلاق هذه النافذة والعودة إلى الصفحة السابقة لإكمال التسجيل.
        </p>
      </div>
    </main>
  );
}
