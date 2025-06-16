import { Inter } from 'next/font/google';
import './globals.css';
import SupabaseProvider from '../components/SupabaseProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-main' });

export const metadata = {
  title: 'Klio AI', 
  description: 'Intelligent Homeschooling, Effortlessly Orchestrated.', 
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
