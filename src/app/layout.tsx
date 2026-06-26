import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { ToastProvider } from '@/components/ui/ToastContext';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BuggyBag Portal',
  description: 'Bug reports admin dashboard',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1f1f1f',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className="h-full">
      <body className={`${geist.className} h-full`}>
        <ToastProvider>
          {children}
        </ToastProvider>
        <Script
          src="/buggy-bag-standalone.js"
          strategy="afterInteractive"
          data-api-key="1a927ee4-21e9-4764-9989-c7bd6c1fcd49"
          data-portal-url={process.env.NEXT_PUBLIC_APP_URL}
        />
      </body>
    </html>
  );
}

