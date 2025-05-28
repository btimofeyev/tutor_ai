// klioai-frontend/src/components/Sidebar.js
import Image from 'next/image'; // Import Next.js Image component
import { FiLogOut, FiSettings, FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // For the logo link

// Assuming you might want to use your main Button component for consistency
// If not, you can style these buttons directly as shown below.
// import Button from './ui/Button'; // Path to your global Button component

export default function Sidebar({ childName, onLogout, onClearChat }) {
  const router = useRouter();

  // Common styles for sidebar action buttons if not using the global Button component
  const sidebarButtonBaseStyles = "w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1";
  const sidebarButtonDefaultStyles = `${sidebarButtonBaseStyles} text-[var(--text-secondary)] hover:bg-[var(--accent-blue)]/20 hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent-blue)]`;
  const sidebarButtonDestructiveStyles = `${sidebarButtonBaseStyles} text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] focus-visible:ring-[var(--accent-red)]`;


  return (
    <aside className="w-56 md:w-60 bg-[var(--background-card)] border-r border-[var(--border-subtle)] flex flex-col p-3 space-y-4">
      {/* Logo/Brand - Klio AI Themed */}
      <div className="pt-3 pb-3 mb-2 border-b border-[var(--border-subtle)]">
        <Link href="/" className="flex items-center justify-center group transition-opacity hover:opacity-80" title="Klio Home">
          <Image
            src="/klio_logo.png" // Assuming your logo is in /public/klio_logo.png
            alt="Klio AI Logo"
            width={32} // Consistent with other sidebar logo size
            height={32}
            className="mr-2"
            priority
          />
          <span className="font-bold text-2xl text-[var(--accent-blue)] group-hover:text-[var(--accent-blue-hover)] transition-colors">
            Klio AI
          </span>
        </Link>
      </div>
      
      <div className="flex-1">
         {/* Future: Placeholder for Projects/Topics List */}
         {/* <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 px-1">Topics</h3>
         <nav className="space-y-0.5">
           <a href="#" className="block px-2.5 py-1.5 rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--accent-blue)]/30 font-medium">
             General Chat
           </a>
           <a href="#" className="block px-2.5 py-1.5 rounded-[var(--radius-md)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-blue)]/10 hover:text-[var(--text-primary)]">
             Space Exploration
           </a>
         </nav> */}
      </div>

      {/* User Info & Actions */}
      <div>
        {childName && (
          <div className="mb-3 p-2.5 bg-[var(--accent-yellow)]/20 border border-[var(--accent-yellow-darker-for-border)]/50 rounded-lg text-center">
            <p className="text-xs text-[var(--text-secondary)] opacity-80">Signed in as</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">{childName}</p>
          </div>
        )}
        <nav className="space-y-1">
          <button
            onClick={onClearChat}
            className={sidebarButtonDefaultStyles}
          >
            <FiRefreshCw size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)]" /> {/* Icon color can also change on hover if desired */}
            <span>New Chat</span>
          </button>
          {/* <button // Example if using the global Button component:
            onClick={onClearChat}
            className="w-full justify-start" // Adjust alignment for sidebar
          >
            <FiRefreshCw size={16} className="mr-2.5 text-[var(--text-tertiary)]" />
            New Chat
          </button> */}
          <button
            onClick={() => router.push('/settings')} // Assuming /settings is the correct path
            className={sidebarButtonDefaultStyles}
          >
            <FiSettings size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)]" />
            <span>Settings</span>
          </button>
          <button
            onClick={onLogout}
            className={sidebarButtonDestructiveStyles}
          >
            <FiLogOut size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-red)]" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}