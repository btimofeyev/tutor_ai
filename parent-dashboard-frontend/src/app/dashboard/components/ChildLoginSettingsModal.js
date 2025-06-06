// app/dashboard/components/ChildLoginSettingsModal.js
'use client';
import React from 'react';
// import { UserCircleIcon, KeyIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Example icons

export default function ChildLoginSettingsModal({
  child, // The child object being edited
  isOpen,
  onClose,
  usernameInput,
  onUsernameInputChange,
  onSetUsername,
  pinInput,
  onPinInputChange,
  pinConfirmInput,
  onPinConfirmInputChange,
  onSetPin,
  isSaving,
  errorMsg,
  successMsg,
}) {
  if (!isOpen || !child) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
        <button 
            onClick={onClose} 
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
        >
            × {/* Or <XMarkIcon className="h-6 w-6" /> */}
        </button>
        <h3 className="text-xl font-semibold mb-1 text-gray-800">Login Settings</h3>
        <p className="text-sm text-gray-500 mb-4">For <span className="font-medium text-blue-600">{child.name}</span></p>

        {errorMsg && <p className="text-red-600 text-sm mb-3 p-2 bg-red-50 rounded">{errorMsg}</p>}
        {successMsg && <p className="text-green-600 text-sm mb-3 p-2 bg-green-50 rounded">{successMsg}</p>}
        
        <div className="space-y-5">
          {/* Username Section */}
          <div className="p-3 border rounded-md">
            <label htmlFor="childUsername" className="block text-sm font-medium text-gray-700">Username</label>
            {child.child_username && (
                <p className="text-xs text-gray-500 mb-1">Current: <span className="font-mono bg-gray-100 px-1 rounded">{child.child_username}</span></p>
            )}
            <div className="mt-1 flex rounded-md shadow-sm">
              <input 
                type="text" 
                id="childUsername"
                value={usernameInput} 
                onChange={onUsernameInputChange}
                className="flex-1 block w-full min-w-0 rounded-none rounded-l-md sm:text-sm border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={child.child_username ? "Enter new username" : "Create a username"}
              />
              <button 
                onClick={onSetUsername} 
                disabled={isSaving || !usernameInput.trim() || usernameInput.trim().length < 3 || usernameInput.trim() === (child.child_username || '')}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : (child.child_username ? "Update" : "Set")}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Min 3 characters. Must be unique.</p>
          </div>

          {/* PIN Section */}
          <div className="p-3 border rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">{child.access_pin_hash ? "Update 4 Digit PIN" : "Set 4 Digit PIN"}</label>
            <div className="space-y-2">
                <input 
                type="password" 
                value={pinInput} 
                onChange={onPinInputChange}
                className="block w-full sm:text-sm border-gray-300 rounded-md p-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter 4 digits"
                maxLength="4"
                autoComplete="new-password" // Prevent browser autofill if desired
                />
                <input 
                type="password" 
                value={pinConfirmInput} 
                onChange={onPinConfirmInputChange}
                className="block w-full sm:text-sm border-gray-300 rounded-md p-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Confirm PIN"
                maxLength="4"
                autoComplete="new-password"
                />
            </div>
            <button 
              onClick={onSetPin}
              disabled={isSaving || !pinInput || !pinConfirmInput || pinInput !== pinConfirmInput || !/^\d{4}$/.test(pinInput)}
              className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving PIN..." : (child.access_pin_hash ? "Update PIN" : "Set PIN")}
            </button>
          </div>
        </div>
        {/* <button onClick={onClose} className="mt-6 w-full text-sm text-gray-600 hover:text-gray-800 py-2 bg-gray-100 rounded-md">Close</button> */}
      </div>
    </div>
  );
}