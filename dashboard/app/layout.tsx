import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'MoltAds Dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="moltads-root">
        {children}
      </body>
    </html>
  );
}
