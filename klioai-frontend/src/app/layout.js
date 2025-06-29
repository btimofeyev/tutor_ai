import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import ErrorBoundary from '../components/ErrorBoundary';

export const metadata = {
  title: 'Klio - Your AI Learning Friend',
  description: 'Learn and explore with Klio, your personal AI tutor',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-fredoka">
        <AuthProvider>
          <SubscriptionProvider>
            {children}
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}