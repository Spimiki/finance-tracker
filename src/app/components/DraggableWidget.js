'use client'

export default function DraggableWidget({ 
  id, 
  title,
  children,
  onRemove 
}) {
  const handleRemoveClick = (e) => {
    e.stopPropagation();
    onRemove(id, title);
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-[24px] p-4 shadow-md transition-all duration-200 w-full h-full border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 group relative cursor-move"
    >
      <div 
        className="absolute top-3 right-3 z-50"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleRemoveClick}
          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      </div>

      <div>
        <h2 className="text-gray-800 dark:text-white text-lg font-medium mb-2 pr-8 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
} 