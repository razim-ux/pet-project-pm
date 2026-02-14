import './globals.css';

export const metadata = {
  title: 'Task Manager',
  description: 'Pet project on Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
