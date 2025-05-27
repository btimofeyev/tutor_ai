import './globals.css';
import SupabaseProvider from '../components/SupabaseProvider';

export const metadata = {
  title: 'Klio AI', 
  description: 'Intelligent Homeschooling, Effortlessly Orchestrated.', 
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}