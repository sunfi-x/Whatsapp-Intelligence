import type { Metadata } from 'next';
import { Quicksand, Mochiy_Pop_P_One } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { SecurityGate } from '@/components/SecurityGate';
import { NavbarVisibilityProvider } from '@/components/NavbarVisibilityContext';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
});

const mochiyPopPOne = Mochiy_Pop_P_One({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-digits',
});

export const metadata: Metadata = {
  title: 'SUNFI AI - WhatsApp Command Center',
  description: 'AI-Powered Personal WhatsApp Communication Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${quicksand.variable} ${mochiyPopPOne.variable}`}>
      <body className={`${quicksand.className} min-h-screen antialiased bg-[#F7FAF9] text-[#111B21] relative pb-20 md:pb-0`}>
        <SecurityGate>
          <NavbarVisibilityProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
                  {children}
                </main>
              </div>
            </div>
          </NavbarVisibilityProvider>
        </SecurityGate>
      </body>
    </html>
  );
}
