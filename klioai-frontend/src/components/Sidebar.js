// klioai-frontend/src/components/Sidebar.js
import Image from 'next/image'; // Import Next.js Image component
import { useState } from 'react';
import { FiLogOut, FiSettings, FiRefreshCw, FiChevronDown, FiChevronRight, FiBookOpen, FiHash, FiHelpCircle, FiTarget, FiEdit3, FiGlobe } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // For the logo link

// Assuming you might want to use your main Button component for consistency
// If not, you can style these buttons directly as shown below.
// import Button from './ui/Button'; // Path to your global Button component

const QUICK_ACTIONS = [
  {
    id: 'homework',
    icon: FiBookOpen,
    label: 'Homework Help',
    message: "I need help with my homework"
  },
  {
    id: 'math',
    icon: FiHash,
    label: 'Math Practice',
    message: "Let's practice some math problems!"
  },
  {
    id: 'explain',
    icon: FiHelpCircle,
    label: 'Explain This',
    message: "Can you explain this concept to me?"
  },
  {
    id: 'quiz',
    icon: FiTarget,
    label: 'Quick Quiz',
    message: "Give me a quick quiz to test my knowledge"
  },
  {
    id: 'writing',
    icon: FiEdit3,
    label: 'Writing Help',
    message: "I need help with writing"
  },
  {
    id: 'science',
    icon: FiGlobe,
    label: 'Science Facts',
    message: "Tell me something cool about science!"
  }
];

export default function Sidebar({ childName, onLogout, onClearChat, onQuickAction }) {
  const router = useRouter();
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);

  // Common styles for sidebar action buttons if not using the global Button component
  const sidebarButtonBaseStyles = "w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1";
  const sidebarButtonDefaultStyles = `${sidebarButtonBaseStyles} text-[var(--text-secondary)] hover:bg-[var(--accent-blue)]/20 hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent-blue)]`;
  const sidebarButtonDestructiveStyles = `${sidebarButtonBaseStyles} text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] focus-visible:ring-[var(--accent-red)]`;


  return (
    <aside className="w-56 md:w-60 bg-[var(--background-card)] border-r border-[var(--border-subtle)] flex flex-col p-3 space-y-4" role="navigation" aria-label="Main navigation">
      {/* Logo/Brand - Klio AI Themed */}
      <div className="pt-3 pb-3 mb-2 border-b border-[var(--border-subtle)]">
        <Link href="/" className="flex items-center justify-center group transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 rounded-md" title="Klio Home" aria-label="Go to Klio AI homepage">
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
        {/* Quick Actions Section */}
        <div className="mb-4">
          <button
            onClick={() => setQuickActionsExpanded(!quickActionsExpanded)}
            className={`${sidebarButtonDefaultStyles} justify-between`}
            aria-expanded={quickActionsExpanded}
            aria-controls="quick-actions-menu"
            aria-label="Toggle quick actions menu"
          >
            <div className="flex items-center space-x-2.5">
              <FiTarget size={16} className="text-[var(--text-tertiary)]" aria-hidden="true" />
              <span>Quick Actions</span>
            </div>
            {quickActionsExpanded ? (
              <FiChevronDown size={16} className="text-[var(--text-tertiary)]" aria-hidden="true" />
            ) : (
              <FiChevronRight size={16} className="text-[var(--text-tertiary)]" aria-hidden="true" />
            )}
          </button>
          
          {quickActionsExpanded && (
            <div className="mt-2 ml-4 space-y-1" id="quick-actions-menu" role="menu">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onQuickAction && onQuickAction(action.message)}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-[var(--radius-md)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-blue)]/10 hover:text-[var(--text-primary)] transition-colors focus-visible:ring-1 focus-visible:ring-[var(--accent-blue)]"
                  role="menuitem"
                  aria-label={action.label}
                >
                  <action.icon size={14} className="text-[var(--text-tertiary)]" aria-hidden="true" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Info & Actions */}
      <div>
        {childName && (
          <div className="mb-3 p-2.5 bg-[var(--accent-yellow)]/20 border border-[var(--accent-yellow-darker-for-border)]/50 rounded-lg text-center" role="status" aria-live="polite">
            <p className="text-xs text-[var(--text-secondary)] opacity-80">Signed in as</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">{childName}</p>
          </div>
        )}
        <nav className="space-y-1" role="menu" aria-label="Account actions">
          <button
            onClick={onClearChat}
            className={sidebarButtonDefaultStyles}
            role="menuitem"
            aria-label="Start a new chat conversation"
          >
            <FiRefreshCw size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)]" aria-hidden="true" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => router.push('/settings')} // Assuming /settings is the correct path
            className={sidebarButtonDefaultStyles}
            role="menuitem"
            aria-label="Open settings page"
          >
            <FiSettings size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)]" aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button
            onClick={onLogout}
            className={sidebarButtonDestructiveStyles}
            role="menuitem"
            aria-label="Sign out of your account"
          >
            <FiLogOut size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-red)]" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}