// klioai-frontend/src/components/ChatAreaHeader.js
export default function ChatAreaHeader({ currentTopic }) {
    return (
      <header className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        {/* Max-width to align with chat content if needed, or full width */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-slate-700">{currentTopic || "Klio Chat"}</h2>
        </div>
      </header>
    );
  }