'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

export function Providers({ 
  children,
  session 
}: { 
  children: ReactNode;
  session?: any;
}) {
  useEffect(() => {
    // Load saved language preference, default to Thai
    const savedLanguage = localStorage.getItem('language') || 'th';
    i18n.changeLanguage(savedLanguage);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <SessionProvider session={session}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              style: {
                border: '1px solid #10b981',
                color: '#065f46',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              style: {
                border: '1px solid #ef4444',
                color: '#991b1b',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </SessionProvider>
    </I18nextProvider>
  );
}