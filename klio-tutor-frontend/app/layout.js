import './globals.css'
import { AuthProvider } from './contexts/AuthContext'

export const metadata = {
  title: 'Klio AI Tutor',
  description: 'AI-powered learning for children',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-fredoka">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
