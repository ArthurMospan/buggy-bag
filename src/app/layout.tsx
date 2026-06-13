import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BuggyBag Portal',
  description: 'Bug reports admin dashboard',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className="h-full">
      <body className={`${geist.className} h-full`}>
        {children}
        <Script
          src="/buggy-bag-standalone.js"
          strategy="afterInteractive"
          data-api-key="b5864fb9-5fef-469d-9e04-94dc7996904c"
          data-api-endpoint="http://localhost:3000/api/bugs/submit"
          data-portal-url="http://localhost:3000"
        />
      </body>
    </html>
  );
}
