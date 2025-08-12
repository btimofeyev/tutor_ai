// DashboardFilters.js
// Extracted filtering section from main dashboard to improve organization
'use client';

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { formInputStyles, formLabelStyles, cardStyles } from '../../../utils/dashboardStyles';
import { APP_CONTENT_TYPES } from '../../../utils/dashboardConstants';
import { formA11y } from '../../../utils/accessibility';

const DashboardFilters = memo(function DashboardFilters({
  filterStatus,
  setFilterStatus,
  filterContentType,
  setFilterContentType,
  sortBy,
  setSortBy,
  searchTerm = '',
  setSearchTerm
}) {
  return (
    <section
      className={`my-6 ${cardStyles} p-4`}
      role="search"
      aria-label="Filter and sort assignments"
    >
      <div className="mb-4">
        <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <span>⚙️</span>
          Filter Assignments
        </h3>
        <p className="text-xs text-text-secondary mt-1">
          Use these filters to focus on what&apos;s most important right now
        </p>
      </div>

      {/* Search Bar - Removed for now */}
      {/* {setSearchTerm && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search assignments by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${formInputStyles} pl-10 py-3 text-base`}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-lg">🔎</span>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )} */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label
            htmlFor="filterStatus"
            className={formLabelStyles}
          >
            Show Me
          </label>
          <select
            {...formA11y.fieldProps('Status Filter', {
              helpText: 'Filter assignments by completion status'
            })}
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${formInputStyles} mt-1`}
          >
            <option value="all">All Assignments</option>
            <option value="needsAttention">🚨 Needs My Attention</option>
            <option value="todaysWork">📅 Today&apos;s Work</option>
            <option value="thisWeek">📚 This Week&apos;s Tasks</option>
            <option value="readyToGrade">⭐ Ready to Grade</option>
            <option value="complete">✅ Finished Work</option>
            <option value="incomplete">📝 Still To Do</option>
            <option value="overdue">⚠️ Past Due</option>
            <option value="dueSoon">⏰ Due Soon</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="filterContentType"
            className={formLabelStyles}
          >
            Type of Work
          </label>
          <select
            {...formA11y.fieldProps('Content Type Filter', {
              helpText: 'Filter assignments by type of work'
            })}
            id="filterContentType"
            value={filterContentType}
            onChange={(e) => setFilterContentType(e.target.value)}
            className={`${formInputStyles} mt-1`}
          >
            <option value="all">All Types</option>
            {APP_CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() +
                  type.slice(1).replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="sortBy"
            className={formLabelStyles}
          >
            Order By
          </label>
          <select
            {...formA11y.fieldProps('Sort Order', {
              helpText: 'Sort assignments by different criteria'
            })}
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`${formInputStyles} mt-1`}
          >
            <option value="createdAtDesc">Newest First</option>
            <option value="createdAtAsc">Oldest First</option>
            <option value="dueDateAsc">Due Date (Earliest)</option>
            <option value="dueDateDesc">Due Date (Latest)</option>
            <option value="titleAsc">Name A-Z</option>
            <option value="titleDesc">Name Z-A</option>
          </select>
        </div>
      </div>
    </section>
  );
});

DashboardFilters.propTypes = {
  filterStatus: PropTypes.string.isRequired,
  setFilterStatus: PropTypes.func.isRequired,
  filterContentType: PropTypes.string.isRequired,
  setFilterContentType: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  setSortBy: PropTypes.func.isRequired,
  searchTerm: PropTypes.string,
  setSearchTerm: PropTypes.func
};

export default DashboardFilters;
