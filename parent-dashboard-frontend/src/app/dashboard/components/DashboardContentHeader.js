// Header section for the main dashboard content with actions
'use client';
import React from 'react';
import PropTypes from 'prop-types';
import { PlusIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

export default function DashboardContentHeader({
  childName,
  hasSubjects,
  batchSelectionMode,
  onToggleBatchMode,
  onAddMaterial
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">
          {childName}&apos;s Learning Journey
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Track assignments, view progress, and manage schoolwork
        </p>
      </div>
      
      <div className="flex gap-3">
        {hasSubjects && (
          <Button
            onClick={onToggleBatchMode}
            variant={batchSelectionMode ? "secondary" : "outline"}
            className="flex-shrink-0"
          >
            {batchSelectionMode ? '✓ Selecting' : '☐ Select Multiple'}
          </Button>
        )}
        
        <Button
          onClick={onAddMaterial}
          variant="primary"
          className="flex-shrink-0"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Assignment
        </Button>
      </div>
    </div>
  );
}

DashboardContentHeader.propTypes = {
  childName: PropTypes.string.isRequired,
  hasSubjects: PropTypes.bool.isRequired,
  batchSelectionMode: PropTypes.bool.isRequired,
  onToggleBatchMode: PropTypes.func.isRequired,
  onAddMaterial: PropTypes.func.isRequired
};