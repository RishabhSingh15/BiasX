import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NotificationProvider } from '@/components/ui/notification';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BiasX | Behavioral Trading Terminal',
  description: 'Behavioral Trading Intelligence & Risk Analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${dmSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="font-body bg-[#E0E5EC] text-[#3D4852] min-h-screen antialiased selection:bg-[#6C63FF]/20 selection:text-[#3D4852]">
        <TooltipProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

