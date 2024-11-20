'use client'

export default function DraggableWidget({ id, title, onRemove, children }) {
  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        {onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            Remove
          </button>
        )}
      </div>
      <div className="widget-content">
        {children}
      </div>
    </div>
  );
} 