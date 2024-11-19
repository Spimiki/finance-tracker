'use client'
import { useState } from 'react';

export default function AddWidgetModal({ isOpen, onClose, onAdd }) {
  const [widgetConfig, setWidgetConfig] = useState({
    title: '',
    size: 'small',
    content: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      id: `widget-${Date.now()}`,
      ...widgetConfig,
      x: 0, // Will be automatically placed
      y: 0
    });
    onClose();
    setWidgetConfig({ title: '', size: 'small', content: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Add New Widget</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Widget Title
              </label>
              <input
                type="text"
                value={widgetConfig.title}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Widget Size
              </label>
              <select
                value={widgetConfig.size}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, size: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5"
              >
                <option value="small">Small (1x1)</option>
                <option value="wide">Wide (2x1)</option>
                <option value="tall">Tall (1x2)</option>
                <option value="large">Large (2x2)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Content
              </label>
              <textarea
                value={widgetConfig.content}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, content: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5"
                rows={3}
                required
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              Add Widget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 