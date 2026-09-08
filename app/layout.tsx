import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Schooldesk — Your school workspace',
  description:
    'Organize your classes, keep your notes together, and stay on top of every assignment.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
