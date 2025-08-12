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
import { getSubjectChartColor } from '../../../utils/subjectColors';

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

const GradeDistributionCard = ({ subject, gradeDistribution, color }) => {
  const total = Object.values(gradeDistribution).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          {subject.subject_name}
        </h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          No graded materials yet
        </div>
      </div>
    );
  }

  // Prepare donut chart data
  const chartData = {
    labels: Object.keys(gradeDistribution),
    datasets: [
      {
        data: Object.values(gradeDistribution),
        backgroundColor: [
          '#10B981', // A - Green
          '#3B82F6', // B - Blue
          '#F59E0B', // C - Amber
          '#EF4444', // D - Red
          '#6B7280'  // F - Gray
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 11
          },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                const count = dataset.data[i];
                const percentage = ((count / total) * 100).toFixed(1);

                return {
                  text: `${label}: ${count} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor,
                  lineWidth: dataset.borderWidth,
                  pointStyle: 'circle'
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          label: function(context) {
            const count = context.parsed;
            const percentage = ((count / total) * 100).toFixed(1);
            return `${context.label}: ${count} materials (${percentage}%)`;
          }
        }
      }
    },
    cutout: '50%'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        {subject.subject_name}
        <span className="text-sm text-gray-500 font-normal">({total} graded)</span>
      </h3>

      <div className="h-48">
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

const OverallGradeDistribution = ({ allSubjects }) => {
  const overallDistribution = useMemo(() => {
    const combined = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    allSubjects.forEach(subject => {
      if (subject.gradeDistribution) {
        Object.entries(subject.gradeDistribution).forEach(([grade, count]) => {
          combined[grade] = (combined[grade] || 0) + count;
        });
      }
    });

    return combined;
  }, [allSubjects]);

  const total = Object.values(overallDistribution).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className="text-gray-500">No graded materials across all subjects</div>
      </div>
    );
  }

  // Prepare horizontal bar chart for overall distribution
  const chartData = {
    labels: Object.keys(overallDistribution),
    datasets: [
      {
        label: 'Number of Materials',
        data: Object.values(overallDistribution),
        backgroundColor: [
          '#10B98180', // A - Green with transparency
          '#3B82F680', // B - Blue with transparency
          '#F59E0B80', // C - Amber with transparency
          '#EF444480', // D - Red with transparency
          '#6B728080'  // F - Gray with transparency
        ],
        borderColor: [
          '#10B981', // A - Green
          '#3B82F6', // B - Blue
          '#F59E0B', // C - Amber
          '#EF4444', // D - Red
          '#6B7280'  // F - Gray
        ],
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      title: {
        display: true,
        text: 'Overall Grade Distribution',
        font: { size: 16, weight: 'bold' },
        color: '#1f2937'
      },
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        callbacks: {
          label: function(context) {
            const count = context.parsed.x;
            const percentage = ((count / total) * 100).toFixed(1);
            return `Grade ${context.label}: ${count} materials (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6'
        },
        ticks: {
          color: '#6b7280',
          callback: function(value) {
            return Number.isInteger(value) ? value : '';
          }
        },
        title: {
          display: true,
          text: 'Number of Materials',
          color: '#374151',
          font: { weight: 'bold' }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="h-64">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Summary statistics */}
      <div className="mt-4 grid grid-cols-5 gap-2 text-center">
        {Object.entries(overallDistribution).map(([grade, count]) => {
          const percentage = ((count / total) * 100).toFixed(1);
          const colors = {
            A: 'text-green-600 bg-green-50',
            B: 'text-blue-600 bg-blue-50',
            C: 'text-amber-600 bg-amber-50',
            D: 'text-red-600 bg-red-50',
            F: 'text-gray-600 bg-gray-50'
          };

          return (
            <div key={grade} className={`p-2 rounded-lg ${colors[grade]}`}>
              <div className="text-sm font-bold">{grade}</div>
              <div className="text-xs">{count} ({percentage}%)</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function GradeDistributionCharts({
  allGrades,
  selectedChild
}) {
  // Calculate grade distribution for each subject
  const subjectGradeData = useMemo(() => {
    if (!selectedChild || !allGrades[selectedChild.id]?.subjects) return [];

    const subjects = allGrades[selectedChild.id].subjects;

    return Object.entries(subjects).map(([subjectId, subjectData]) => {
      const color = getSubjectChartColor(subjectData.subject_name);

      // Calculate grade distribution from materials
      const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

      if (subjectData.materials) {
        subjectData.materials.forEach(material => {
          if (material.percentage !== null && material.percentage !== undefined) {
            let letterGrade;
            if (material.percentage >= 90) letterGrade = 'A';
            else if (material.percentage >= 80) letterGrade = 'B';
            else if (material.percentage >= 70) letterGrade = 'C';
            else if (material.percentage >= 60) letterGrade = 'D';
            else letterGrade = 'F';

            gradeDistribution[letterGrade]++;
          }
        });
      }

      return {
        id: subjectId,
        ...subjectData,
        color: color,
        gradeDistribution: gradeDistribution
      };
    }).filter(subject => subject.total_materials > 0);
  }, [allGrades, selectedChild]);

  if (!selectedChild) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
        <p className="text-gray-500">Choose a student to view grade distribution charts.</p>
      </div>
    );
  }

  if (subjectGradeData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Grade Data</h3>
        <p className="text-gray-500">Add and grade some materials to see distribution charts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Distribution Chart */}
      <OverallGradeDistribution allSubjects={subjectGradeData} />

      {/* Individual Subject Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {subjectGradeData.map(subject => (
          <GradeDistributionCard
            key={subject.id}
            subject={subject}
            gradeDistribution={subject.gradeDistribution}
            color={subject.color}
          />
        ))}
      </div>
    </div>
  );
}
