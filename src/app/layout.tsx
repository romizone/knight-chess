import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/layout/SessionProvider';

export const metadata: Metadata = {
  title: 'Knight Chess - 5 Knights Chess Variant',
  description: 'Experience the unique chess variant with 5 knights per side on an extended 8x9 board.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
