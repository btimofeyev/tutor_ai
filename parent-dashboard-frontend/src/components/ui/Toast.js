// parent-dashboard-frontend/src/components/ui/Toast.js
'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

export default function Toast({ message, type = 'success', onClose }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true); // Trigger fade-in
  }, []);

  const baseClasses = 'fixed bottom-5 right-5 flex items-center p-4 pr-10 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ease-in-out transform';
  
  const typeClasses = {
    success: 'bg-green-100 text-green-800 border border-green-200',
    error: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
  };

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5 mr-3 text-green-500" />,
    error: <XCircleIcon className="h-5 w-5 mr-3 text-red-500" />,
    info: <InformationCircleIcon className="h-5 w-5 mr-3 text-blue-500" />,
  };

  const animationClasses = show
    ? 'translate-y-0 opacity-100'
    : 'translate-y-4 opacity-0';

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${animationClasses}`} role="alert">
      {icons[type]}
      <span>{message}</span>
      <button 
        onClick={onClose} 
        className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-full hover:bg-black/10"
        aria-label="Close"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
