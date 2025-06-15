// app/schedule/components/ScheduleSettings.js
"use client";

export default function ScheduleSettings({ childId, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-background-card rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Schedule Settings</h3>
        <p className="text-text-secondary">Schedule settings will be implemented here.</p>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}