"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function PnLGraph({ trades }) {
  // Process trades to get cumulative P/L data
  const pnlData = trades
    .filter(trade => trade.status === 'closed')
    .map(trade => {
      const pnlValue = trade.exitMarketCap - trade.marketCapAtEntryValue;
      const pnlUSD = pnlValue * (trade.size * trade.solPrice / trade.marketCapAtEntryValue);
      return {
        date: new Date(trade.exitDate),
        pnl: pnlUSD
      };
    })
    .sort((a, b) => a.date - b.date);

  // Calculate cumulative P/L
  let cumulativePnL = 0;
  const chartData = pnlData.map(item => {
    cumulativePnL += item.pnl;
    return {
      date: item.date,
      pnl: cumulativePnL
    };
  });

  // Calculate min and max values for better scaling
  const pnlValues = chartData.map(item => item.pnl);
  const maxPnL = Math.max(...pnlValues, 0);
  const minPnL = Math.min(...pnlValues, 0);
  const range = maxPnL - minPnL;
  const padding = range * 0.05; // Reduced padding to 5%

  const data = {
    labels: chartData.map(item => item.date.toLocaleDateString()),
    datasets: [
      {
        label: 'Cumulative P/L ($)',
        data: chartData.map(item => item.pnl),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'P/L Over Time'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `P/L: $${value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: minPnL - padding, // Use min instead of suggestedMin
        max: maxPnL + padding, // Use max instead of suggestedMax
        ticks: {
          callback: (value) => `$${value.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}`,
          maxTicksLimit: 8 // Limit number of ticks
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          maxTicksLimit: 10 // Limit number of x-axis labels
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.2 // Slight curve to the line
      },
      point: {
        radius: 3, // Smaller points
        borderWidth: 1,
        backgroundColor: 'white'
      }
    }
  };

  return (
    <div className="h-[400px] w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {chartData.length > 0 ? (
        <Line data={data} options={options} />
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
          No closed trades to display
        </div>
      )}
    </div>
  );
} 