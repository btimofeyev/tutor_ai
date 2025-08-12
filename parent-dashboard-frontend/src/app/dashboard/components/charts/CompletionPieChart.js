// app/dashboard/components/charts/CompletionPieChart.js
import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const CompletionPieChart = ({ completed, total }) => {
  if (total === 0) return <p className="text-xs text-text-tertiary italic text-center py-4">No data.</p>;

  const data = {
    labels: ['Completed', 'Incomplete'],
    datasets: [
      {
        label: 'Items',
        data: [completed, total - completed],
        backgroundColor: [
          'var(--accent-green)', // Completed
          '#E5E7EB',          // Incomplete (Tailwind gray-200) or var(--border-subtle)
        ],
        borderColor: [
          'var(--accent-green)',
          '#E5E7EB',
        ],
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Simplified: remove legend for small chart
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        titleFont: { size: 10 },
        bodyFont: { size: 10 },
        padding: 8,
        cornerRadius: 4,
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) { label += ': '; }
            if (context.parsed !== null) {
              label += context.parsed;
              const percentage = Math.round((context.parsed / total) * 100);
              label += ` (${percentage}%)`;
            }
            return label;
          }
        }
      }
    },
    cutout: '60%', // Makes it a doughnut chart, a bit more modern
  };

  return <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <Pie data={data} options={options} />
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
            }}>
                <div className="text-lg font-semibold text-text-primary">
                    {total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%'}
                </div>
                <div className="text-[10px] text-text-tertiary -mt-1">Done</div>
            </div>
         </div>;
};

export default CompletionPieChart;
