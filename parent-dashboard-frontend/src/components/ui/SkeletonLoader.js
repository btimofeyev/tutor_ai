// components/ui/SkeletonLoader.js
'use client';
import React from 'react';

export const SkeletonLine = ({ width = "100%", height = "16px", className = "" }) => (
  <div 
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

export const SkeletonCard = ({ children, className = "" }) => (
  <div className={`p-4 border border-gray-200 rounded-lg bg-white ${className}`}>
    {children}
  </div>
);

export const SubjectCardSkeleton = () => (
  <SkeletonCard className="space-y-4">
    {/* Subject header */}
    <div className="flex justify-between items-center">
      <SkeletonLine width="200px" height="24px" />
      <SkeletonLine width="80px" height="20px" />
    </div>
    
    {/* Stats */}
    <div className="flex gap-6">
      <div className="space-y-1">
        <SkeletonLine width="60px" height="12px" />
        <SkeletonLine width="40px" height="16px" />
      </div>
      <div className="space-y-1">
        <SkeletonLine width="80px" height="12px" />
        <SkeletonLine width="50px" height="16px" />
      </div>
      <div className="space-y-1">
        <SkeletonLine width="70px" height="12px" />
        <SkeletonLine width="45px" height="16px" />
      </div>
    </div>
    
    {/* Units */}
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <SkeletonLine width="150px" height="18px" />
          <div className="ml-4 space-y-2">
            {[1, 2].map(j => (
              <div key={j} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="space-y-1 flex-1">
                  <SkeletonLine width="60%" height="14px" />
                  <SkeletonLine width="40%" height="12px" />
                </div>
                <SkeletonLine width="60px" height="20px" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </SkeletonCard>
);

export const CurriculumSkeletonLoader = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <SkeletonLine width="200px" height="28px" />
      <SkeletonLine width="120px" height="36px" />
    </div>
    
    {[1, 2, 3].map(i => (
      <SubjectCardSkeleton key={i} />
    ))}
  </div>
);

export default SkeletonLoader;