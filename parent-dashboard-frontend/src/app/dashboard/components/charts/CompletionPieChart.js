// app/dashboard/components/charts/CompletionPieChart.js
import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const CompletionPieChart = ({ completed, total }) => {
  if (total === 0) return <p className="text-xs text-gray-400 italic text-center py-4">No data for chart.</p>;

  const data = {
    labels: ['Completed', 'Incomplete'],
    datasets: [
      {
        label: '# of Items',
        data: [completed, total - completed],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)', 
          'rgba(255, 99, 132, 0.7)', 
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
            boxWidth: 12,
            padding:15,
            font: { size: 10}
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
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
  };

  return <div style={{ height: '130px', width: '130px', margin: 'auto' }}><Pie data={data} options={options} /></div>;
};

export default CompletionPieChart;