// components/ui/Breadcrumbs.js
'use client';

import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

const Breadcrumbs = ({ items = [], className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className={`flex items-center space-x-1 text-sm text-gray-600 mb-4 ${className}`} aria-label="Breadcrumb">
      <Link
        href="/"
        className="flex items-center hover:text-blue-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Home"
      >
        <HomeIcon className="h-4 w-4" />
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRightIcon className="h-4 w-4 mx-2 text-gray-400" />
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-blue-600 transition-colors font-medium p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {item.label}
            </Link>
          ) : (
            <span className={`${index === items.length - 1 ? 'text-gray-900 font-semibold' : 'text-gray-600 font-medium'}`}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

Breadcrumbs.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string
  })),
  className: PropTypes.string
};

export default Breadcrumbs;
