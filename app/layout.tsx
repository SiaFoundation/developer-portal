import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sia Developer Documentation',
  description:
    'Developer documentation for Sia — decentralized cloud storage.',
  icons: '/logo.png',
};

// Inline script to apply saved theme before first paint (avoids flash).
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light-mode');document.documentElement.style.backgroundColor='#fff'}else{document.documentElement.style.backgroundColor='#0f0f0f'}}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-[#0f0f0f] light:bg-white m-0">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
