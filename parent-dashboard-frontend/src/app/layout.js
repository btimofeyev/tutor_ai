import './globals.css';
import SupabaseProvider from '../components/SupabaseProvider';

export const metadata = {
  title: 'EduNest',
  description: 'Where Family Learning Takes Flight',
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
