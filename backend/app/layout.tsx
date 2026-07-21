export const metadata = {
  title: 'CLIDLE 관리자',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '24px', background: '#111', color: '#eee' }}>
        {children}
      </body>
    </html>
  );
}
