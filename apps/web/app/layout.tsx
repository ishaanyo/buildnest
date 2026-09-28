export const metadata = {
  title: 'BuildNest API',
  description: 'AI Room Interior Design + Material & Labor Packages',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', margin: 0, padding: 24, background: '#0f0f12', color: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  );
}
