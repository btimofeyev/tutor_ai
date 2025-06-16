import { Inter } from 'next/font/google';
import './globals.css';
import SupabaseProvider from '../components/SupabaseProvider';
import { ToastProvider } from '../hooks/useToast';
import ToastContainer from '../components/Toast';

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
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
