'use client';
import React, { useState, useMemo } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatContentTypeName } from '../../../utils/dashboardConstants';

const GradePercentageBar = ({ percentage }) => {
  const getColor = () => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
        <div
          className={`h-2 rounded-full ${getColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-medium ${
        percentage >= 70 ? 'text-gray-900' : 'text-red-600'
      }`}>
        {percentage}%
      </span>
    </div>
  );
};

const MaterialGradeRow = ({ material, customCategories = [] }) => {
  const percentage = material.percentage || 0;
  const isGraded = material.grade_value !== null && material.grade_value !== undefined;

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-6 py-3 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          {isGraded ? (
            <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : material.completed_at ? (
            <ClockIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="truncate max-w-xs" title={material.title}>
            {material.title}
          </span>
        </div>
      </td>
      <td className="px-6 py-3 text-sm text-gray-600 capitalize">
        {formatContentTypeName(material.content_type, customCategories)}
      </td>
      <td className="px-6 py-3 text-sm text-gray-600">
        {material.due_date || 'No due date'}
      </td>
      <td className="px-6 py-3 text-sm text-gray-600">
        {material.completed_at
          ? new Date(material.completed_at).toLocaleDateString()
          : 'Not completed'
        }
      </td>
      <td className="px-6 py-3 text-sm text-gray-900">
        {isGraded ? (
          <span className="font-medium">
            {material.grade_value}/{material.grade_max_value || 100}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-3">
        {isGraded ? (
          <GradePercentageBar percentage={percentage} />
        ) : (
          <span className="text-sm text-gray-400">Not graded</span>
        )}
      </td>
    </tr>
  );
};

const SubjectGradeSection = ({ subject, subjectData, isExpanded, onToggle, customCategories = [] }) => {
  const avgGrade = subjectData.stats?.avgGradePercent || 0;
  const gradedCount = subjectData.graded_count || 0;
  const totalMaterials = subjectData.total_materials || 0;
  const ungradedCount = subjectData.ungraded_count || 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
          <BookOpenIcon className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">{subjectData.subject_name}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{gradedCount}</span> graded /
            <span className="font-medium"> {totalMaterials}</span> total
          </div>
          {ungradedCount > 0 && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
              {ungradedCount} needs grading
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Average:</span>
            <GradePercentageBar percentage={avgGrade} />
          </div>
        </div>
      </button>

      {isExpanded && subjectData.materials && subjectData.materials.length > 0 && (
        <div className="bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 border-t border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {subjectData.materials.map(material => (
                <MaterialGradeRow
                  key={material.id}
                  material={material}
                  customCategories={customCategories}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function GradebookGradeTable({
  allGrades,
  childrenList,
  loading = false,
  customCategories = []
}) {
  const [expandedChildren, setExpandedChildren] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});

  const toggleChild = (childId) => {
    setExpandedChildren(prev => ({
      ...prev,
      [childId]: !prev[childId]
    }));
  };

  const toggleSubject = (childId, subjectId) => {
    const key = `${childId}-${subjectId}`;
    setExpandedSubjects(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    const allSubjectsExpanded = {};

    Object.keys(allGrades).forEach(childId => {
      allExpanded[childId] = true;
      Object.keys(allGrades[childId].subjects || {}).forEach(subjectId => {
        allSubjectsExpanded[`${childId}-${subjectId}`] = true;
      });
    });

    setExpandedChildren(allExpanded);
    setExpandedSubjects(allSubjectsExpanded);
  };

  const collapseAll = () => {
    setExpandedChildren({});
    setExpandedSubjects({});
  };

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    let totalGraded = 0;
    let totalMaterials = 0;
    let totalScore = 0;
    let totalMaxScore = 0;

    Object.values(allGrades).forEach(childData => {
      Object.values(childData.subjects || {}).forEach(subjectData => {
        totalMaterials += subjectData.total_materials || 0;
        totalGraded += subjectData.graded_count || 0;

        subjectData.materials?.forEach(material => {
          if (material.grade_value !== null && material.grade_max_value) {
            totalScore += material.grade_value;
            totalMaxScore += material.grade_max_value;
          }
        });
      });
    });

    const overallAverage = totalMaxScore > 0
      ? Math.round((totalScore / totalMaxScore) * 100)
      : 0;

    return {
      totalGraded,
      totalMaterials,
      overallAverage,
      gradingCompletion: totalMaterials > 0
        ? Math.round((totalGraded / totalMaterials) * 100)
        : 0
    };
  }, [allGrades]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (Object.keys(allGrades).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Grade Data Available</h3>
        <p className="text-gray-500">
          No graded materials found for the selected students.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            Grade Overview
          </h3>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Expand All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {overallStats.overallAverage}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Overall Average</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {overallStats.totalGraded}
            </div>
            <div className="text-sm text-gray-600 mt-1">Materials Graded</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {overallStats.totalMaterials}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Materials</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {overallStats.gradingCompletion}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Grading Complete</div>
          </div>
        </div>
      </div>

      {/* Grade Tables by Child */}
      <div className="space-y-4">
        {Object.entries(allGrades).map(([childId, childData]) => {
          const isChildExpanded = expandedChildren[childId] !== false;
          const childInfo = childrenList.find(c => c.id === parseInt(childId));

          return (
            <div key={childId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleChild(childId)}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {isChildExpanded ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                  )}
                  <UserIcon className="h-5 w-5 text-gray-700" />
                  <span className="font-semibold text-gray-900 text-lg">
                    {childData.child_name}
                  </span>
                  {childData.child_grade && (
                    <span className="text-sm text-gray-600">
                      (Grade {childData.child_grade})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {Object.keys(childData.subjects || {}).length} subjects
                  </span>
                </div>
              </button>

              {isChildExpanded && (
                <div className="p-4 space-y-3">
                  {Object.entries(childData.subjects || {}).map(([subjectId, subjectData]) => (
                    <SubjectGradeSection
                      key={subjectId}
                      subject={subjectId}
                      subjectData={subjectData}
                      isExpanded={expandedSubjects[`${childId}-${subjectId}`] !== false}
                      onToggle={() => toggleSubject(childId, subjectId)}
                      customCategories={customCategories}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
