import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';

export const metadata = {
  title: 'Klio - Your AI Learning Friend',
  description: 'Learn and explore with Klio, your personal AI tutor',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-fredoka">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}