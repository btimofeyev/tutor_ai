// klioai-frontend/src/components/Sidebar.js
import { FiLogOut, FiSettings, FiRefreshCw } from 'react-icons/fi'; // Removed FiMessageSquare if not used for logo
import { useRouter } from 'next/navigation';

export default function Sidebar({ childName, onLogout, onClearChat }) {
  const router = useRouter();

  return (
    <aside className="w-56 md:w-60 bg-slate-50 border-r border-slate-200 flex flex-col p-3 space-y-4"> {/* Reduced padding slightly */}
      {/* Logo/Brand */}
      <div 
        className="flex items-center justify-center pt-3 pb-3 mb-2 cursor-pointer group border-b border-slate-200" // Centered logo
        onClick={() => router.push('/')}
        title="Klio Home"
      >
        {/* Screenshot shows text logo */}
        <span className="font-bold text-3xl text-purple-600 group-hover:text-purple-700 transition-colors">Klio</span>
      </div>
      
      <div className="flex-1">
         {/* Future: Placeholder for Projects/Topics List */}
         {/* <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Topics</h3>
         <nav className="space-y-0.5">
           <a href="#" className="block px-2.5 py-1.5 rounded-md text-sm text-slate-700 bg-purple-100 font-medium">
             General Chat
           </a>
           <a href="#" className="block px-2.5 py-1.5 rounded-md text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700">
             Space Exploration
           </a>
         </nav> */}
      </div>

      {/* User Info & Actions */}
      <div>
        {childName && (
          <div className="mb-3 p-2.5 bg-purple-50 border border-purple-100 rounded-lg text-center"> {/* Light purple bg */}
            <p className="text-xs text-purple-700 opacity-80">Signed in as</p>
            <p className="font-semibold text-sm text-purple-800">{childName}</p>
          </div>
        )}
        <nav className="space-y-1">
          <button
            onClick={onClearChat}
            className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
          >
            <FiRefreshCw size={16} className="text-slate-500" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
          >
            <FiSettings size={16} className="text-slate-500" />
            <span>Settings</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-red-100 hover:text-red-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
          >
            <FiLogOut size={16} className="text-slate-500" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}