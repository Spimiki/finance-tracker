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

  const data = {
    labels: chartData.map(item => item.date.toLocaleDateString()),
    datasets: [
      {
        label: 'Cumulative P/L ($)',
        data: chartData.map(item => item.pnl),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1
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
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="h-[400px] w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <Line data={data} options={options} />
    </div>
  );
} 