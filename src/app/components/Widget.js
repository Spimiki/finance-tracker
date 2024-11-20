'use client'

import { XMarkIcon } from '@heroicons/react/20/solid'

const Widget = ({ children, title, onClose }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-3 border-b dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
        <h3 className="font-medium">{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <XMarkIcon className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
        {children}
      </div>
    </div>
  );
};

export default Widget; 