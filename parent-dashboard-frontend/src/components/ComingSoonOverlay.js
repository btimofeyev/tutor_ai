// Reusable Coming Soon overlay component
'use client';
import React from 'react';
import { SparklesIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';

export default function ComingSoonOverlay({ 
  title = "Coming Soon!", 
  message = "This feature is currently in development and will be available soon.",
  showIcon = true,
  iconType = 'sparkles', // 'sparkles' or 'rocket'
  className = "",
  children,
  variant = 'overlay' // 'overlay', 'banner', 'inline'
}) {
  const Icon = iconType === 'rocket' ? RocketLaunchIcon : SparklesIcon;
  
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4 ${className}`}>
        <div className="flex items-center">
          {showIcon && <Icon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">{title}</h3>
            <p className="text-sm text-blue-700 mt-0.5">{message}</p>
          </div>
        </div>
        {children}
      </div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
        {showIcon && <Icon className="h-3 w-3 mr-1" />}
        {title}
      </span>
    );
  }
  
  // Default overlay variant
  return (
    <div className={`absolute inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg ${className}`}>
      <div className="text-center p-8 max-w-sm">
        {showIcon && (
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        {children}
      </div>
    </div>
  );
}

// Convenience components for common use cases
export function ComingSoonBadge({ className = "" }) {
  return (
    <ComingSoonOverlay
      variant="inline"
      title="Coming Soon"
      showIcon={true}
      className={className}
    />
  );
}

export function ComingSoonBanner({ 
  message = "This feature is currently in development. Stay tuned for updates!",
  className = "" 
}) {
  return (
    <ComingSoonOverlay
      variant="banner"
      title="🚀 Feature Coming Soon"
      message={message}
      showIcon={false}
      className={className}
    />
  );
}