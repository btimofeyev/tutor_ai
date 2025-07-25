// Dashboard header component with child selector and navigation
'use client';
import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';

export default function DashboardHeader({ 
  selectedChild, 
  childrenList, 
  onChildSelect,
  showChildSelector = true 
}) {
  return (
    <div className="bg-white border-b border-border-subtle p-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-text-primary">
            Tutor AI Dashboard
          </h1>
          {selectedChild && (
            <div className="hidden sm:block text-sm text-text-secondary">
              {selectedChild.name} • Grade {selectedChild.grade || 'N/A'}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Desktop Child Selector */}
          {showChildSelector && childrenList && childrenList.length > 0 && (
            <div className="hidden sm:block">
              <select
                value={selectedChild?.id || ''}
                onChange={(e) => {
                  const child = childrenList.find(c => c.id === parseInt(e.target.value));
                  onChildSelect(child);
                }}
                className="p-2 border border-border-subtle rounded-lg bg-white text-text-primary text-sm"
              >
                <option value="">Select Child...</option>
                {childrenList.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name} (Grade {child.grade || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Logout Button */}
          <Link
            href="/logout"
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            title="Logout"
          >
            ⬅️
          </Link>
        </div>
      </div>
      
      {/* Mobile Child Selector */}
      {showChildSelector && childrenList && childrenList.length > 0 && (
        <div className="sm:hidden mt-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Child
          </label>
          <select
            value={selectedChild?.id || ''}
            onChange={(e) => {
              const child = childrenList.find(c => c.id === parseInt(e.target.value));
              onChildSelect(child);
            }}
            className="w-full p-3 border border-border-subtle rounded-lg bg-white text-text-primary"
          >
            <option value="">Choose a child...</option>
            {childrenList.map(child => (
              <option key={child.id} value={child.id}>
                {child.name} (Grade {child.grade || 'N/A'})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

DashboardHeader.propTypes = {
  selectedChild: PropTypes.object,
  childrenList: PropTypes.array, // Can be undefined during initial load
  onChildSelect: PropTypes.func.isRequired,
  showChildSelector: PropTypes.bool
};