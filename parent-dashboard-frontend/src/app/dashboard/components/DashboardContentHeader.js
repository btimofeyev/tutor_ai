// Header section for the main dashboard content with actions
'use client';
import React from 'react';
import PropTypes from 'prop-types';

export default function DashboardContentHeader({
  childName
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">
          {childName}&apos;s Dashboard
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Track assignments, view progress, and manage schoolwork
        </p>
      </div>
    </div>
  );
}

DashboardContentHeader.propTypes = {
  childName: PropTypes.string.isRequired
};