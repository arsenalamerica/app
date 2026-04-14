import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Arsenal America',
};

interface Props {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: Readonly<Props>): React.ReactNode {
  return (
    <html lang='en'>
      <body>
        <main>{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
