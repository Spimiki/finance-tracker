'use client'

import { ChartBarIcon } from '@heroicons/react/24/outline';
import TradesTracker from './TradesTracker';

export default function AddWidgetModal({ isOpen, onClose, onAdd }) {
  if (!isOpen) return null;

  const handleAdd = () => {
    onAdd({
      id: `widget-${Date.now()}`,
      title: 'Trades Tracker',
      contentType: 'trades-tracker',
      size: 'large',
      x: 0,
      y: 0
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add Widget</h2>
        <div className="space-y-4">
          <div 
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            onClick={handleAdd}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Trades Tracker
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 