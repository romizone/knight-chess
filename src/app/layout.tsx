import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/layout/SessionProvider';

export const metadata: Metadata = {
  title: 'AI Knight Chess - Strategic Chess Variant Powered by Minimax AI',
  description: 'A strategic chess variant with 5 knights per side on an extended 8x9 board, powered by a custom Minimax AI Engine with alpha-beta pruning. The non-standard 8x9 board combined with 5 knights per side makes it almost impossible for humans or traditional chess AI engines like Stockfish to win.',
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
