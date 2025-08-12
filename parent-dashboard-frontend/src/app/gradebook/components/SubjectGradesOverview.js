'use client';
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  BookOpenIcon,
  ChartBarIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getSubjectColor, getSubjectChartColor } from '../../../utils/subjectColors';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SubjectPerformanceCard = ({ subject, stats, color }) => {
  const getPerformanceIndicator = (average) => {
    if (average >= 90) return { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent', letter: 'A' };
    if (average >= 80) return { icon: CheckCircleIcon, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good', letter: 'B' };
    if (average >= 70) return { icon: ClockIcon, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair', letter: 'C' };
    if (average >= 60) return { icon: ExclamationTriangleIcon, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Needs Work', letter: 'D' };
    return { icon: ExclamationTriangleIcon, color: 'text-red-600', bg: 'bg-red-100', label: 'Concerning', letter: 'F' };
  };

  const indicator = getPerformanceIndicator(stats.avgGradePercent || 0);
  const IndicatorIcon = indicator.icon;
  const progressPercent = subject.total_materials > 0 ? Math.round((subject.graded_count / subject.total_materials) * 100) : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow">
      {/* Subject header with colored accent */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold text-gray-900 text-sm">{subject.subject_name}</h3>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${indicator.bg} ${indicator.color}`}>
          <IndicatorIcon className="h-3 w-3" />
          <span className="hidden sm:inline">{indicator.label}</span>
        </div>
      </div>

      {/* Statistics grid - more compact */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-xl font-bold" style={{ color: color }}>
              {stats.avgGradePercent ? `${Math.round(stats.avgGradePercent)}%` : 'N/A'}
            </span>
            {stats.avgGradePercent && (
              <span className="text-base font-semibold text-gray-600">({indicator.letter})</span>
            )}
          </div>
          <div className="text-xs text-gray-500">Average</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-700">
            {subject.graded_count || 0}
          </div>
          <div className="text-xs text-gray-500">Graded</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">
            {subject.total_materials || 0}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-orange-600">
            {subject.ungraded_count || 0}
          </div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
      </div>

      {/* Progress bar - more compact */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span className="font-medium text-gray-700">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              backgroundColor: color,
              width: `${progressPercent}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default function SubjectGradesOverview({
  allGrades,
  selectedChild,
  customCategories = []
}) {
  // Calculate comprehensive statistics for all subjects
  const subjectStats = useMemo(() => {
    if (!selectedChild || !allGrades[selectedChild.id]?.subjects) return [];

    const subjects = allGrades[selectedChild.id].subjects;

    return Object.entries(subjects).map(([subjectId, subjectData]) => {
      const color = getSubjectChartColor(subjectData.subject_name);

      return {
        id: subjectId,
        ...subjectData,
        color: color
      };
    }).filter(subject => subject.total_materials > 0); // Only show subjects with materials
  }, [allGrades, selectedChild]);

  // Prepare data for the overview bar chart
  const chartData = useMemo(() => {
    const labels = subjectStats.map(subject => subject.subject_name);
    const averages = subjectStats.map(subject => Math.round(subject.stats?.avgGradePercent || 0));
    const colors = subjectStats.map(subject => subject.color);

    return {
      labels,
      datasets: [
        {
          label: 'Average Grade (%)',
          data: averages,
          backgroundColor: colors.map(color => color + '80'), // Add transparency
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 4,
          maxBarThickness: 60
        }
      ]
    };
  }, [subjectStats]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `${selectedChild?.name}'s Subject Performance`,
        font: { size: 16, weight: 'bold' },
        color: '#1f2937'
      },
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          afterBody: function(tooltipItems) {
            const index = tooltipItems[0].dataIndex;
            const subject = subjectStats[index];
            return [
              `Materials Graded: ${subject.graded_count}/${subject.total_materials}`,
              `Pending: ${subject.ungraded_count}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: '#f3f4f6'
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          color: '#6b7280'
        },
        title: {
          display: true,
          text: 'Average Grade (%)',
          color: '#374151',
          font: { weight: 'bold' }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280',
          maxRotation: 45
        }
      }
    }
  };

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (subjectStats.length === 0) {
      return {
        overallAverage: 0,
        totalMaterials: 0,
        totalGraded: 0,
        totalPending: 0,
        subjectCount: 0
      };
    }

    const totalGraded = subjectStats.reduce((sum, subject) => sum + subject.graded_count, 0);
    const totalMaterials = subjectStats.reduce((sum, subject) => sum + subject.total_materials, 0);
    const totalPending = subjectStats.reduce((sum, subject) => sum + subject.ungraded_count, 0);

    // Calculate weighted average based on number of graded materials per subject
    let weightedSum = 0;
    let totalWeight = 0;

    subjectStats.forEach(subject => {
      if (subject.graded_count > 0 && subject.stats?.avgGradePercent) {
        weightedSum += subject.stats.avgGradePercent * subject.graded_count;
        totalWeight += subject.graded_count;
      }
    });

    const overallAverage = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    return {
      overallAverage,
      totalMaterials,
      totalGraded,
      totalPending,
      subjectCount: subjectStats.length
    };
  }, [subjectStats]);

  if (!selectedChild) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
        <p className="text-gray-500">Choose a student to view their subject grade overview.</p>
      </div>
    );
  }

  if (subjectStats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects with Materials</h3>
        <p className="text-gray-500">Add some materials to subjects to see grade overview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Overall Performance</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">
                {overallStats.overallAverage}%
              </span>
              <span className="text-xl font-semibold text-gray-600">
                ({overallStats.overallAverage >= 90 ? 'A' :
                  overallStats.overallAverage >= 80 ? 'B' :
                  overallStats.overallAverage >= 70 ? 'C' :
                  overallStats.overallAverage >= 60 ? 'D' : 'F'})
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-green-600">{overallStats.totalGraded}</div>
              <div className="text-xs text-gray-500">Graded</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600">{overallStats.totalMaterials}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600">{overallStats.totalPending}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Subject Cards - Better grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {subjectStats.map(subject => (
          <SubjectPerformanceCard
            key={subject.id}
            subject={subject}
            stats={subject.stats || {}}
            color={subject.color}
          />
        ))}
      </div>
    </div>
  );
}
