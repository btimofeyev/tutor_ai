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
  setSortBy
}) {
  return (
    <section 
      className={`my-6 ${cardStyles} p-4`}
      role="search"
      aria-label="Filter and sort materials"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label
            htmlFor="filterStatus"
            className={formLabelStyles}
          >
            Filter by Status
          </label>
          <select
            {...formA11y.fieldProps('Status Filter', { 
              helpText: 'Filter materials by completion status' 
            })}
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${formInputStyles} mt-1`}
          >
            <option value="all">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
            <option value="overdue">Overdue</option>
            <option value="dueSoon">Due Soon (7d)</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="filterContentType"
            className={formLabelStyles}
          >
            Filter by Content Type
          </label>
          <select
            {...formA11y.fieldProps('Content Type Filter', { 
              helpText: 'Filter materials by content type' 
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
            Sort By
          </label>
          <select
            {...formA11y.fieldProps('Sort Order', { 
              helpText: 'Sort materials by different criteria' 
            })}
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`${formInputStyles} mt-1`}
          >
            <option value="createdAtDesc">Most Recent</option>
            <option value="createdAtAsc">Oldest</option>
            <option value="dueDateAsc">Due Date ↑</option>
            <option value="dueDateDesc">Due Date ↓</option>
            <option value="titleAsc">Title A-Z</option>
            <option value="titleDesc">Title Z-A</option>
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
  setSortBy: PropTypes.func.isRequired
};

export default DashboardFilters;